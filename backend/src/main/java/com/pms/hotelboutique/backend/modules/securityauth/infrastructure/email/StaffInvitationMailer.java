package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.email;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationException;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationException.Failure.STAFF_WRITE_UNAVAILABLE;

/** Staff message using the existing PMS SMTP bean; Guest message behavior is unchanged. */
@Component
public class StaffInvitationMailer {
    private final ObjectProvider<JavaMailSender> transport;
    private final String from,publicUrl;
    public StaffInvitationMailer(ObjectProvider<JavaMailSender> transport,
            @Value("${pms.smtp.from:}") String from,
            @Value("${pms.staff.invitation-url:http://localhost:3001/activar-staff}") String publicUrl){
        this.transport=transport;this.from=from;this.publicUrl=publicUrl;
    }
    private static boolean local(String host){return "localhost".equals(host)||"127.0.0.1".equals(host)||"::1".equals(host);}
    public void send(String recipient,String token){
        try {
            var sender=transport.getIfAvailable();
            var uri=URI.create(publicUrl);
            if(sender==null||from.isBlank()||uri.getHost()==null||uri.getRawUserInfo()!=null
                ||uri.getRawQuery()!=null||uri.getRawFragment()!=null||!("https".equals(uri.getScheme())||("http".equals(uri.getScheme())&&local(uri.getHost()))))throw new IllegalArgumentException();
            var message=sender.createMimeMessage();var helper=new MimeMessageHelper(message,"UTF-8");
            helper.setFrom(from);helper.setTo(recipient);helper.setSubject("Prepara tu acceso Staff — PMS Hotel Boutique");
            helper.setText("Establece tu contraseña Staff en este enlace de un solo uso:\n"+publicUrl+"#token="+token
                +"\nExpira en 30 minutos. Al establecer tu contraseña, tu cuenta se activará si conserva los requisitos de acceso. Si no esperabas esta invitación, ignora este mensaje.",false);
            sender.send(message); // Success means actual SMTP acceptance, never a mock/log fallback.
        } catch(Exception failure){throw new StaffAdminMutationException(STAFF_WRITE_UNAVAILABLE);}
    }
}
