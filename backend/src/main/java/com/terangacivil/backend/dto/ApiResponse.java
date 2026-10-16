package com.terangacivil.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private String status = "success";
    private String token;
    private String message;
    private T data;

    public ApiResponse(T data) {
        this.status = "success";
        this.data = data;
    }

    public ApiResponse(String token, T data) {
        this.status = "success";
        this.token = token;
        this.data = data;
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(data);
    }

    public static <T> ApiResponse<T> success(String token, T data) {
        return new ApiResponse<>(token, data);
    }

    public static <T> ApiResponse<T> error(String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setStatus("error");
        response.setMessage(message);
        return response;
    }
}
