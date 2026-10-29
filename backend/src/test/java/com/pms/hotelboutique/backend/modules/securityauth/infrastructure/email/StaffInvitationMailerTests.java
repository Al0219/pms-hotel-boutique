package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.email;

import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email.SmtpEmailConfiguration;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationException;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StaffInvitationMailerTests {
    private final ApplicationContextRunner runner=new ApplicationContextRunner()
        .withUserConfiguration(SmtpEmailConfiguration.class,StaffInvitationMailer.class)
        .withPropertyValues("pms.email.provider=smtp","pms.smtp.host=smtp.gmail.com","pms.smtp.port=587",
            "pms.smtp.username=qa@example.test","pms.smtp.app-password=synthetic-app-password",
            "pms.smtp.from=qa@example.test","pms.staff.invitation-url=http://localhost:3001/activar-staff")
        .withBean(BeanPostProcessor.class,()->new BeanPostProcessor(){
            @Override public Object postProcessAfterInitialization(Object bean,String name){
                if(bean instanceof JavaMailSenderImpl original){
                    var sender=spy(original);doNothing().when(sender).send(any(MimeMessage.class));return sender;
                }
                return bean;
            }
        });

    @Test void invitationUsesExistingGmailBeanAndConfiguration(){
        runner.run(app->{
            assertNull(app.getStartupFailure());
            var sender=app.getBean(JavaMailSenderImpl.class);
            assertEquals("smtp.gmail.com",sender.getHost());assertEquals(587,sender.getPort());
            assertEquals("qa@example.test",sender.getUsername());
            assertEquals("true",sender.getJavaMailProperties().getProperty("mail.smtp.starttls.required"));
            app.getBean(StaffInvitationMailer.class).send("staff@example.test","synthetic-token");
            var message=ArgumentCaptor.forClass(MimeMessage.class);verify(sender,times(1)).send(message.capture());
            assertEquals("qa@example.test",message.getValue().getFrom()[0].toString());
            assertEquals("staff@example.test",message.getValue().getAllRecipients()[0].toString());
            assertTrue(message.getValue().getContent().toString().contains("http://localhost:3001/activar-staff#token=synthetic-token"));
            assertNotNull(app.getBean("smtpEmailSender"));
        });
    }
    @Test void deliveryFailureIsSanitizedAndNeverRetried(){
        runner.run(app->{
            var sender=app.getBean(JavaMailSenderImpl.class);
            doThrow(new MailSendException("private-provider-details")).when(sender).send(any(MimeMessage.class));
            var error=assertThrows(StaffAdminMutationException.class,()->app.getBean(StaffInvitationMailer.class).send("staff@example.test","synthetic-token"));
            assertNull(error.getCause());assertFalse(error.toString().contains("private-provider-details"));
            verify(sender,times(1)).send(any(MimeMessage.class));
        });
    }
    @Test void missingSmtpProviderCannotPretendToSend(){
        runner.withPropertyValues("pms.email.provider=resend").run(app->{
            assertNull(app.getStartupFailure());
            assertThrows(StaffAdminMutationException.class,()->app.getBean(StaffInvitationMailer.class).send("staff@example.test","synthetic-token"));
        });
    }
}
