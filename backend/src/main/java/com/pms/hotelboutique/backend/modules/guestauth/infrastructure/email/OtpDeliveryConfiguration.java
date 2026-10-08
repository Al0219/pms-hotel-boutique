package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email;

import java.util.concurrent.Executor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class OtpDeliveryConfiguration {
    @Bean(name = "otpDeliveryExecutor")
    Executor otpDeliveryExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("reservation-otp-");
        executor.initialize();
        return executor;
    }
}
