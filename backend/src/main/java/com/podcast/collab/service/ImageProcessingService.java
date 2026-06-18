package com.podcast.collab.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImageProcessingService {

    public static final int HD_WIDTH = 3000;
    public static final int HD_HEIGHT = 3000;
    public static final int THUMBNAIL_WIDTH = 400;
    public static final int THUMBNAIL_HEIGHT = 400;

    private final MinioService minioService;

    public byte[] generateHdCover(
            String title,
            String subtitle,
            String primaryColor,
            String secondaryColor,
            String accentColor,
            String fontFamily,
            String layoutType,
            String referenceImageUrl,
            String styleKey
    ) throws Exception {
        BufferedImage image = generateCover(
                HD_WIDTH, HD_HEIGHT,
                title, subtitle,
                primaryColor, secondaryColor, accentColor,
                fontFamily, layoutType,
                referenceImageUrl,
                styleKey
        );
        return imageToBytes(image, "png");
    }

    public byte[] generateThumbnail(byte[] hdImageBytes) throws Exception {
        ByteArrayInputStream inputStream = new ByteArrayInputStream(hdImageBytes);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Thumbnails.of(inputStream)
                .size(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
                .outputFormat("png")
                .outputQuality(0.9)
                .toOutputStream(outputStream);
        return outputStream.toByteArray();
    }

    public byte[] resizeImage(byte[] imageBytes, int width, int height) throws Exception {
        ByteArrayInputStream inputStream = new ByteArrayInputStream(imageBytes);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Thumbnails.of(inputStream)
                .size(width, height)
                .outputFormat("png")
                .outputQuality(0.95)
                .toOutputStream(outputStream);
        return outputStream.toByteArray();
    }

    public String uploadCoverImage(String objectName, byte[] imageBytes, boolean isPublic) throws Exception {
        InputStream inputStream = new ByteArrayInputStream(imageBytes);
        String contentType = "image/png";
        if (isPublic) {
            return minioService.uploadPublicFile(objectName, inputStream, imageBytes.length, contentType);
        } else {
            return minioService.uploadFile(objectName, inputStream, imageBytes.length, contentType);
        }
    }

    private BufferedImage generateCover(
            int width, int height,
            String title, String subtitle,
            String primaryColor, String secondaryColor, String accentColor,
            String fontFamily, String layoutType,
            String referenceImageUrl,
            String styleKey
    ) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = image.createGraphics();

        setupRenderingHints(g2d);

        if (referenceImageUrl != null && !referenceImageUrl.isEmpty()) {
            try {
                BufferedImage referenceImage = loadReferenceImage(referenceImageUrl, width, height);
                g2d.drawImage(referenceImage, 0, 0, null);
                applyColorOverlay(g2d, width, height, primaryColor);
            } catch (Exception e) {
                log.warn("加载参考图失败，使用默认背景: {}", e.getMessage());
                drawBackground(g2d, width, height, primaryColor, secondaryColor, styleKey);
            }
        } else {
            drawBackground(g2d, width, height, primaryColor, secondaryColor, styleKey);
        }

        drawDecorativeElements(g2d, width, height, accentColor, styleKey);
        drawText(g2d, width, height, title, subtitle, primaryColor, secondaryColor, accentColor, fontFamily, layoutType);

        g2d.dispose();
        return image;
    }

    private void setupRenderingHints(Graphics2D g2d) {
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2d.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
    }

    private void drawBackground(Graphics2D g2d, int width, int height,
                                 String primaryColor, String secondaryColor, String styleKey) {
        Color primary = parseColor(primaryColor, "#2563EB");
        Color secondary = parseColor(secondaryColor, "#F8FAFC");

        if ("VIBRANT_GRADIENT".equals(styleKey) || "CREATIVE_ILLUSTRATION".equals(styleKey) || "OVERLAY".equals(styleKey)) {
            GradientPaint gradient = new GradientPaint(
                    0, 0, primary,
                    width, height, secondary
            );
            g2d.setPaint(gradient);
        } else if ("DARK_PROFESSIONAL".equals(styleKey) || "DYNAMIC_SPORTS".equals(styleKey)) {
            GradientPaint gradient = new GradientPaint(
                    0, 0, primary,
                    0, height, secondary
            );
            g2d.setPaint(gradient);
        } else {
            g2d.setColor(primary);
        }
        g2d.fillRect(0, 0, width, height);
    }

    private void applyColorOverlay(Graphics2D g2d, int width, int height, String primaryColor) {
        Color overlay = parseColor(primaryColor, "#2563EB");
        Color semiTransparent = new Color(overlay.getRed(), overlay.getGreen(), overlay.getBlue(), 120);
        g2d.setColor(semiTransparent);
        g2d.fillRect(0, 0, width, height);
    }

    private void drawDecorativeElements(Graphics2D g2d, int width, int height,
                                         String accentColor, String styleKey) {
        Color accent = parseColor(accentColor, "#F59E0B");
        Random random = new Random(styleKey != null ? styleKey.hashCode() : 42);

        switch (styleKey != null ? styleKey : "MODERN_MINIMAL") {
            case "MODERN_MINIMAL", "BUSINESS_FORMAL" -> {
                int circleSize = width / 3;
                g2d.setColor(new Color(accent.getRed(), accent.getGreen(), accent.getBlue(), 50));
                g2d.fillOval(-circleSize / 2, -circleSize / 2, circleSize, circleSize);
                g2d.fillOval(width - circleSize / 2, height - circleSize / 2, circleSize, circleSize);
            }
            case "VIBRANT_GRADIENT", "CREATIVE_ILLUSTRATION" -> {
                g2d.setColor(new Color(accent.getRed(), accent.getGreen(), accent.getBlue(), 80));
                for (int i = 0; i < 8; i++) {
                    int x = random.nextInt(width);
                    int y = random.nextInt(height);
                    int size = 50 + random.nextInt(150);
                    g2d.fillOval(x, y, size, size);
                }
            }
            case "WARM_NATURE", "LITERARY_FRESH" -> {
                g2d.setColor(new Color(accent.getRed(), accent.getGreen(), accent.getBlue(), 60));
                int barWidth = width / 12;
                for (int i = 0; i < 12; i++) {
                    int barHeight = 50 + random.nextInt(height / 3);
                    g2d.fillRoundRect(i * barWidth, height - barHeight, barWidth - 10, barHeight, 20, 20);
                }
            }
            case "DARK_PROFESSIONAL", "DYNAMIC_SPORTS" -> {
                g2d.setColor(new Color(accent.getRed(), accent.getGreen(), accent.getBlue(), 100));
                g2d.setStroke(new BasicStroke(15));
                g2d.drawLine(0, height / 3, width, height / 3);
                g2d.drawLine(0, height * 2 / 3, width, height * 2 / 3);
                g2d.setStroke(new BasicStroke(1));
            }
            default -> {
                g2d.setColor(new Color(accent.getRed(), accent.getGreen(), accent.getBlue(), 40));
                int cornerSize = width / 5;
                RoundRectangle2D rect = new RoundRectangle2D.Float(
                        (float) (width * 0.05), (float) (height * 0.05),
                        (float) (width * 0.9), (float) (height * 0.9),
                        cornerSize, cornerSize
                );
                g2d.draw(rect);
            }
        }
    }

    private void drawText(Graphics2D g2d, int width, int height,
                           String title, String subtitle,
                           String primaryColor, String secondaryColor, String accentColor,
                           String fontFamily, String layoutType) {
        String actualFontFamily = (fontFamily != null && !fontFamily.isEmpty()) ? fontFamily : "SansSerif";
        Color textColor = isLightColor(parseColor(primaryColor, "#2563EB"))
                ? Color.BLACK
                : Color.WHITE;
        Color accentTextColor = parseColor(accentColor, "#F59E0B");

        int padding = width / 12;
        int centerX = width / 2;
        int centerY = height / 2;

        if ("LEFT_ALIGNED".equals(layoutType)) {
            drawLeftAlignedText(g2d, title, subtitle, actualFontFamily, textColor, accentTextColor, width, height, padding);
        } else if ("OVERLAY".equals(layoutType)) {
            drawOverlayText(g2d, title, subtitle, actualFontFamily, textColor, accentTextColor, width, height, padding, accentColor);
        } else {
            drawCenteredText(g2d, title, subtitle, actualFontFamily, textColor, accentTextColor, centerX, centerY, width);
        }
    }

    private void drawCenteredText(Graphics2D g2d, String title, String subtitle,
                                   String fontFamily, Color textColor, Color accentColor,
                                   int centerX, int centerY, int width) {
        int titleSize = width / 12;
        Font titleFont = createFont(fontFamily, Font.BOLD, titleSize);
        g2d.setFont(titleFont);
        FontMetrics fm = g2d.getFontMetrics();

        String[] titleLines = wrapText(title, width - 200, fm);
        int totalTitleHeight = titleLines.length * fm.getHeight();

        int subtitleSize = width / 25;
        Font subtitleFont = createFont(fontFamily, Font.PLAIN, subtitleSize);
        g2d.setFont(subtitleFont);
        FontMetrics sfm = g2d.getFontMetrics();
        String[] subtitleLines = subtitle != null ? wrapText(subtitle, width - 300, sfm) : new String[0];
        int totalSubtitleHeight = subtitleLines.length * sfm.getHeight();

        int gap = width / 30;
        int startY = centerY - (totalTitleHeight + gap + totalSubtitleHeight) / 2;

        g2d.setColor(accentColor);
        int accentBarWidth = width / 6;
        g2d.fillRect(centerX - accentBarWidth / 2, startY - width / 20, accentBarWidth, 12);

        g2d.setColor(textColor);
        g2d.setFont(titleFont);
        fm = g2d.getFontMetrics();
        for (int i = 0; i < titleLines.length; i++) {
            int lineWidth = fm.stringWidth(titleLines[i]);
            g2d.drawString(titleLines[i], centerX - lineWidth / 2, startY + (i + 1) * fm.getHeight() - fm.getDescent());
        }

        if (subtitleLines.length > 0) {
            g2d.setColor(new Color(textColor.getRed(), textColor.getGreen(), textColor.getBlue(), 200));
            g2d.setFont(subtitleFont);
            sfm = g2d.getFontMetrics();
            int subtitleY = startY + totalTitleHeight + gap;
            for (int i = 0; i < subtitleLines.length; i++) {
                int lineWidth = sfm.stringWidth(subtitleLines[i]);
                g2d.drawString(subtitleLines[i], centerX - lineWidth / 2, subtitleY + (i + 1) * sfm.getHeight() - sfm.getDescent());
            }
        }
    }

    private void drawLeftAlignedText(Graphics2D g2d, String title, String subtitle,
                                      String fontFamily, Color textColor, Color accentColor,
                                      int width, int height, int padding) {
        int titleSize = width / 14;
        Font titleFont = createFont(fontFamily, Font.BOLD, titleSize);
        g2d.setFont(titleFont);
        FontMetrics fm = g2d.getFontMetrics();

        int maxWidth = width - 2 * padding - width / 6;
        String[] titleLines = wrapText(title, maxWidth, fm);

        int subtitleSize = width / 28;
        Font subtitleFont = createFont(fontFamily, Font.PLAIN, subtitleSize);
        g2d.setFont(subtitleFont);
        FontMetrics sfm = g2d.getFontMetrics();
        String[] subtitleLines = subtitle != null ? wrapText(subtitle, maxWidth, sfm) : new String[0];

        int startY = height / 2 - (titleLines.length * fm.getHeight() + subtitleLines.length * sfm.getHeight()) / 2;

        g2d.setColor(accentColor);
        g2d.fillRect(padding, startY - height / 15, 10, height / 6);

        g2d.setColor(textColor);
        g2d.setFont(titleFont);
        fm = g2d.getFontMetrics();
        for (int i = 0; i < titleLines.length; i++) {
            g2d.drawString(titleLines[i], padding + 40, startY + (i + 1) * fm.getHeight() - fm.getDescent());
        }

        if (subtitleLines.length > 0) {
            g2d.setColor(new Color(textColor.getRed(), textColor.getGreen(), textColor.getBlue(), 200));
            g2d.setFont(subtitleFont);
            sfm = g2d.getFontMetrics();
            int subtitleY = startY + titleLines.length * fm.getHeight() + 30;
            for (int i = 0; i < subtitleLines.length; i++) {
                g2d.drawString(subtitleLines[i], padding + 40, subtitleY + (i + 1) * sfm.getHeight() - sfm.getDescent());
            }
        }
    }

    private void drawOverlayText(Graphics2D g2d, String title, String subtitle,
                                  String fontFamily, Color textColor, Color accentColor,
                                  int width, int height, int padding, String accentColorStr) {
        Color overlayBg = new Color(0, 0, 0, 140);
        int overlayHeight = height / 3;
        g2d.setColor(overlayBg);
        g2d.fillRect(0, height - overlayHeight, width, overlayHeight);

        Color accent = parseColor(accentColorStr, "#F59E0B");
        g2d.setColor(accent);
        g2d.fillRect(0, height - overlayHeight, width, 10);

        int titleSize = width / 16;
        Font titleFont = createFont(fontFamily, Font.BOLD, titleSize);
        g2d.setFont(titleFont);
        FontMetrics fm = g2d.getFontMetrics();

        int maxWidth = width - 2 * padding;
        String[] titleLines = wrapText(title, maxWidth, fm);

        int subtitleSize = width / 30;
        Font subtitleFont = createFont(fontFamily, Font.PLAIN, subtitleSize);
        g2d.setFont(subtitleFont);
        FontMetrics sfm = g2d.getFontMetrics();
        String[] subtitleLines = subtitle != null ? wrapText(subtitle, maxWidth, sfm) : new String[0];

        int centerX = width / 2;
        int totalHeight = titleLines.length * fm.getHeight() + (subtitleLines.length > 0 ? 20 + subtitleLines.length * sfm.getHeight() : 0);
        int startY = height - overlayHeight + (overlayHeight - totalHeight) / 2;

        g2d.setColor(Color.WHITE);
        g2d.setFont(titleFont);
        fm = g2d.getFontMetrics();
        for (int i = 0; i < titleLines.length; i++) {
            int lineWidth = fm.stringWidth(titleLines[i]);
            g2d.drawString(titleLines[i], centerX - lineWidth / 2, startY + (i + 1) * fm.getHeight() - fm.getDescent());
        }

        if (subtitleLines.length > 0) {
            g2d.setColor(new Color(255, 255, 255, 220));
            g2d.setFont(subtitleFont);
            sfm = g2d.getFontMetrics();
            int subtitleY = startY + titleLines.length * fm.getHeight() + 20;
            for (int i = 0; i < subtitleLines.length; i++) {
                int lineWidth = sfm.stringWidth(subtitleLines[i]);
                g2d.drawString(subtitleLines[i], centerX - lineWidth / 2, subtitleY + (i + 1) * sfm.getHeight() - sfm.getDescent());
            }
        }
    }

    private String[] wrapText(String text, int maxWidth, FontMetrics fm) {
        if (text == null || text.isEmpty()) {
            return new String[]{""};
        }
        java.util.List<String> lines = new java.util.ArrayList<>();
        String[] words = text.split("\\s+");
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            String testLine = currentLine.length() == 0 ? word : currentLine + " " + word;
            if (fm.stringWidth(testLine) <= maxWidth) {
                currentLine = new StringBuilder(testLine);
            } else {
                if (currentLine.length() > 0) {
                    lines.add(currentLine.toString());
                }
                currentLine = new StringBuilder(word);
            }
        }
        if (currentLine.length() > 0) {
            lines.add(currentLine.toString());
        }

        if (lines.isEmpty()) {
            lines.add(text);
        }

        return lines.toArray(new String[0]);
    }

    private Font createFont(String fontFamily, int style, int size) {
        try {
            String cleanFamily = fontFamily.split(",")[0].trim();
            return new Font(cleanFamily, style, size);
        } catch (Exception e) {
            return new Font(Font.SANS_SERIF, style, size);
        }
    }

    private BufferedImage loadReferenceImage(String url, int targetWidth, int targetHeight) throws Exception {
        URL imageUrl = new URL(url);
        BufferedImage original = ImageIO.read(imageUrl);
        if (original == null) {
            throw new Exception("无法加载参考图");
        }

        BufferedImage scaled = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = scaled.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);

        double scale = Math.max((double) targetWidth / original.getWidth(), (double) targetHeight / original.getHeight());
        int scaledWidth = (int) (original.getWidth() * scale);
        int scaledHeight = (int) (original.getHeight() * scale);
        int x = (targetWidth - scaledWidth) / 2;
        int y = (targetHeight - scaledHeight) / 2;

        g.drawImage(original, x, y, scaledWidth, scaledHeight, null);
        g.dispose();

        return scaled;
    }

    private Color parseColor(String colorStr, String defaultColor) {
        if (colorStr == null || colorStr.isEmpty()) {
            colorStr = defaultColor;
        }
        try {
            if (colorStr.startsWith("#")) {
                colorStr = colorStr.substring(1);
            }
            if (colorStr.length() == 6) {
                int r = Integer.parseInt(colorStr.substring(0, 2), 16);
                int g = Integer.parseInt(colorStr.substring(2, 4), 16);
                int b = Integer.parseInt(colorStr.substring(4, 6), 16);
                return new Color(r, g, b);
            } else if (colorStr.length() == 8) {
                int r = Integer.parseInt(colorStr.substring(0, 2), 16);
                int g = Integer.parseInt(colorStr.substring(2, 4), 16);
                int b = Integer.parseInt(colorStr.substring(4, 6), 16);
                int a = Integer.parseInt(colorStr.substring(6, 8), 16);
                return new Color(r, g, b, a);
            }
        } catch (NumberFormatException e) {
            log.warn("颜色解析失败: {}", colorStr);
        }
        return Color.decode(defaultColor.startsWith("#") ? defaultColor : "#" + defaultColor);
    }

    private boolean isLightColor(Color color) {
        double yiq = (color.getRed() * 299 + color.getGreen() * 587 + color.getBlue() * 114) / 1000.0;
        return yiq >= 160;
    }

    private byte[] imageToBytes(BufferedImage image, String format) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, format, baos);
        return baos.toByteArray();
    }
}
