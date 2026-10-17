package com.terangacivil.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.io.File;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        File dir1 = new File("uploads").getAbsoluteFile();
        if (!dir1.exists()) {
            dir1.mkdirs();
        }
        File dir2 = new File("backend/uploads").getAbsoluteFile();
        if (!dir2.exists()) {
            dir2.mkdirs();
        }

        registry.addResourceHandler("/api/uploads/**")
                .addResourceLocations("file:" + dir1.getAbsolutePath() + "/", "file:" + dir2.getAbsolutePath() + "/");
    }
}
