package com.terangacivil.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender javaMailSender;

    @Autowired
    private TemplateEngine templateEngine;

    @Value("${mail.from.address}")
    private String fromAddress;

    @Value("${mail.from.name}")
    private String fromName;

    @Async
    public void sendHtmlEmail(String to, String subject, String templateName, Map<String, Object> variables) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            // true = multipart message
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, fromName);
            helper.setTo(to);
            helper.setSubject(subject);

            Context context = new Context();
            context.setVariables(variables);
            
            String htmlContent = templateEngine.process(templateName, context);
            helper.setText(htmlContent, true);

            // Add inline logo
            try {
                ClassPathResource clr = new ClassPathResource("static/images/logo.png");
                if (clr.exists()) {
                    helper.addInline("logoImage", clr);
                }
            } catch (Exception e) {
                // Ignore missing logo
            }

            javaMailSender.send(message);
            System.out.println("[EmailService] Email envoyé avec succès à : " + to);
            
        } catch (Exception e) {
            System.err.println("[EmailService] Erreur lors de l'envoi de l'email à " + to + " : " + e.getMessage());
        }
    }
}
