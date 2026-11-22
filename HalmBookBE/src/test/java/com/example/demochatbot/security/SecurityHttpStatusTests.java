package com.example.demochatbot.security;

import com.example.demochatbot.config.JwtAuthenticationFilter;
import com.example.demochatbot.config.JwtTokenProvider;
import com.example.demochatbot.config.SecurityConfig;
import com.example.demochatbot.enums.Role;
import com.example.demochatbot.model.Account;
import com.example.demochatbot.repository.AccountRepository;
import com.example.demochatbot.service.auth.TokenBlacklistService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.support.TestPropertySourceUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.Optional;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Real security chain + signed JWTs, without MySQL, RabbitMQ or application startup.
class SecurityHttpStatusTests {
    static AnnotationConfigWebApplicationContext context;
    static MockMvc mvc;
    static String memberToken;
    static String adminToken;

    @BeforeAll
    static void start() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        TestPropertySourceUtils.addInlinedPropertiesToEnvironment(context,
                "jwt.secret=HalmBookSecurityHttpStatusRegressionTestKeyMustBeAtLeast512BitsLongForHS512Signing2026",
                "jwt.expiration=3600000");
        context.register(TestConfig.class);
        context.refresh();
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        JwtTokenProvider tokens = context.getBean(JwtTokenProvider.class);
        memberToken = tokens.generateToken("member", "ROLE_USER");
        adminToken = tokens.generateToken("admin", "ROLE_ADMIN");
    }

    @AfterAll
    static void stop() { if (context != null) context.close(); }

    @ParameterizedTest
    @ValueSource(strings = {"/api/admin/books", "/api/admin/support-tickets", "/api/admin/support-tickets/1", "/api/admin/analytics/summary", "/api/promotions", "/api/promotions/1"})
    void adminResourcesRequireAuthenticationAndAdminRole(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.error").value("FORBIDDEN"));
        mvc.perform(get(path).header("Authorization", "Bearer " + adminToken)).andExpect(status().isOk());
    }

    @Test
    void deniedAdminRequestDoesNotRevokeValidMemberSession() throws Exception {
        mvc.perform(get("/api/user/me").header("Authorization", "Bearer " + memberToken)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/books").header("Authorization", "Bearer " + memberToken)).andExpect(status().isForbidden());
        mvc.perform(get("/api/user/me").header("Authorization", "Bearer " + memberToken)).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/home/promotions", "/api/home/vouchers", "/api/home/potato/packages"})
    void catalogueRemainsPublic(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isOk());
    }

    @Configuration
    @EnableWebSecurity
    @EnableWebMvc
    @Import(SecurityConfig.class)
    static class TestConfig {
        @Bean AccountRepository accounts() {
            AccountRepository repository = mock(AccountRepository.class);
            for (Role role : new Role[]{Role.USER, Role.ADMIN}) {
                Account account = new Account();
                account.setUsername(role == Role.USER ? "member" : "admin");
                account.setRole(role);
                when(repository.findByUsername(account.getUsername())).thenReturn(Optional.of(account));
            }
            return repository;
        }
        @Bean JwtTokenProvider tokens() {
            return new JwtTokenProvider();
        }
        @Bean TokenBlacklistService blacklist() { return new TokenBlacklistService(); }
        @Bean JwtAuthenticationFilter jwtFilter(JwtTokenProvider tokens, UserDetailsService users, TokenBlacklistService blacklist) {
            return new JwtAuthenticationFilter(tokens, users, blacklist);
        }
        @Bean ProbeController probe() { return new ProbeController(); }
    }

    @RestController
    static class ProbeController {
        @GetMapping({"/api/admin/books", "/api/admin/support-tickets", "/api/admin/support-tickets/1",
                "/api/admin/analytics/summary", "/api/promotions", "/api/promotions/1", "/api/user/me",
                "/api/home/promotions", "/api/home/vouchers", "/api/home/potato/packages"})
        String probe() { return "ok"; }
    }
}
