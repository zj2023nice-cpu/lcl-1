package com.podcast.collab.validation;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 密码强度验证器
 * 自定义密码安全校验工具类
 */
public class PasswordConstraintValidator {

    /** 最小密码长度 */
    private static final int MIN_LENGTH = 10;

    /** 允许的特殊字符集合 */
    private static final String SPECIAL_CHARACTERS = "!@#$%^&*()_+-=[]{}|;':\",.<>?/";

    /** 字母正则 */
    private static final Pattern LETTER_PATTERN = Pattern.compile("[a-zA-Z]");

    /** 数字正则 */
    private static final Pattern DIGIT_PATTERN = Pattern.compile("[0-9]");

    /** 特殊字符正则 */
    private static final Pattern SPECIAL_CHAR_PATTERN = Pattern.compile(
            "[" + Pattern.quote(SPECIAL_CHARACTERS) + "]"
    );

    /**
     * 私有构造函数，防止实例化
     */
    private PasswordConstraintValidator() {
    }

    /**
     * 验证密码是否符合要求
     *
     * @param password 待验证的密码
     * @param username 用户名（用于检查密码是否包含用户名）
     * @param email    邮箱（用于检查密码是否包含邮箱）
     * @return 错误信息列表，如果列表为空则表示验证通过
     */
    public static List<String> validatePassword(String password, String username, String email) {
        List<String> errors = new ArrayList<>();

        if (password == null || password.isEmpty()) {
            errors.add("密码不能为空");
            return errors;
        }

        // 检查密码长度
        if (password.length() < MIN_LENGTH) {
            errors.add("密码长度至少需要 " + MIN_LENGTH + " 位字符");
        }

        // 检查是否包含字母
        if (!LETTER_PATTERN.matcher(password).find()) {
            errors.add("密码必须包含至少一个字母");
        }

        // 检查是否包含数字
        if (!DIGIT_PATTERN.matcher(password).find()) {
            errors.add("密码必须包含至少一个数字");
        }

        // 检查是否包含特殊字符
        if (!SPECIAL_CHAR_PATTERN.matcher(password).find()) {
            errors.add("密码必须包含至少一个特殊字符（!@#$%^&*()_+-=[]{}|;':\",.<>?/）");
        }

        // 检查是否包含用户名
        if (username != null && !username.isEmpty() &&
                password.toLowerCase().contains(username.toLowerCase())) {
            errors.add("密码不能包含用户名");
        }

        // 检查是否包含邮箱（忽略大小写）
        if (email != null && !email.isEmpty() &&
                password.toLowerCase().contains(email.toLowerCase())) {
            errors.add("密码不能包含邮箱地址");
        }

        return errors;
    }

    /**
     * 判断密码是否满足强度要求（不检查用户名和邮箱）
     *
     * @param password 待验证的密码
     * @return true 表示密码强度足够，false 表示不满足要求
     */
    public static boolean isPasswordStrong(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            return false;
        }

        // 必须同时包含字母、数字和特殊字符
        boolean hasLetter = LETTER_PATTERN.matcher(password).find();
        boolean hasDigit = DIGIT_PATTERN.matcher(password).find();
        boolean hasSpecialChar = SPECIAL_CHAR_PATTERN.matcher(password).find();

        return hasLetter && hasDigit && hasSpecialChar;
    }

    /**
     * 获取允许的特殊字符列表
     *
     * @return 特殊字符字符串
     */
    public static String getAllowedSpecialCharacters() {
        return SPECIAL_CHARACTERS;
    }

    /**
     * 获取最小密码长度
     *
     * @return 最小长度
     */
    public static int getMinLength() {
        return MIN_LENGTH;
    }
}
