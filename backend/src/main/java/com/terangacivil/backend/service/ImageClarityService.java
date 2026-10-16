package com.terangacivil.backend.service;

import org.springframework.stereotype.Service;
import java.awt.image.BufferedImage;
import java.io.InputStream;
import javax.imageio.ImageIO;

@Service
public class ImageClarityService {

    // Threshold score for image clarity. Sobel variance threshold is typically around 10.0 to 15.0.
    private static final double SHARPNESS_THRESHOLD = 15.0;

    public static class ClarityResult {
        private final boolean clear;
        private final double score;

        public ClarityResult(boolean clear, double score) {
            this.clear = clear;
            this.score = score;
        }

        public boolean isClear() { return clear; }
        public double getScore() { return score; }
    }

    public ClarityResult analyzeClarity(InputStream inputStream) {
        try {
            BufferedImage image = ImageIO.read(inputStream);
            if (image == null) {
                System.out.println("[Clarity] Invalid image file");
                return new ClarityResult(false, 0.0);
            }

            int width = image.getWidth();
            int height = image.getHeight();
            
            // If the image resolution is too small, it's not clear/usable
            if (width < 300 || height < 300) {
                System.out.println("[Clarity] Resolution too low: " + width + "x" + height);
                return new ClarityResult(false, 0.0);
            }

            // Convert to grayscale grid
            int[][] gray = new int[width][height];
            for (int x = 0; x < width; x++) {
                for (int y = 0; y < height; y++) {
                    int rgb = image.getRGB(x, y);
                    int r = (rgb >> 16) & 0xFF;
                    int g = (rgb >> 8) & 0xFF;
                    int b = rgb & 0xFF;
                    gray[x][y] = (int) (0.299 * r + 0.587 * g + 0.114 * b);
                }
            }

            // Apply Sobel filter and collect gradient magnitudes
            double sum = 0.0;
            double sumSq = 0.0;
            int count = 0;

            int[][] sobelX = {
                {-1, 0, 1},
                {-2, 0, 2},
                {-1, 0, 1}
            };
            int[][] sobelY = {
                {-1, -2, -1},
                { 0,  0,  0},
                { 1,  2,  1}
            };

            // Process every 2nd pixel to keep it fast on mobile photos
            for (int x = 1; x < width - 1; x += 2) {
                for (int y = 1; y < height - 1; y += 2) {
                    double gx = 0;
                    double gy = 0;

                    for (int kx = -1; kx <= 1; kx++) {
                        for (int ky = -1; ky <= 1; ky++) {
                            int val = gray[x + kx][y + ky];
                            gx += val * sobelX[kx + 1][ky + 1];
                            gy += val * sobelY[kx + 1][ky + 1];
                        }
                    }

                    double magnitude = Math.sqrt(gx * gx + gy * gy);
                    sum += magnitude;
                    sumSq += magnitude * magnitude;
                    count++;
                }
            }

            if (count == 0) {
                return new ClarityResult(false, 0.0);
            }

            double mean = sum / count;
            double variance = (sumSq / count) - (mean * mean);

            boolean clear = variance >= SHARPNESS_THRESHOLD;
            System.out.println("[Clarity] Analyzed image with resolution " + width + "x" + height + ". Sobel variance score: " + variance + ". Clear: " + clear);
            return new ClarityResult(clear, variance);

        } catch (Exception e) {
            System.out.println("[Clarity] Analysis error: " + e.getMessage());
            return new ClarityResult(false, 0.0);
        }
    }
}
