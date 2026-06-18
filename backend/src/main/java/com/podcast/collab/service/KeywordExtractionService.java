package com.podcast.collab.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class KeywordExtractionService {

    private static final Map<String, List<String>> CATEGORY_KEYWORDS = new LinkedHashMap<>();
    private static final Map<String, VisualTheme> CATEGORY_VISUAL_THEMES = new HashMap<>();

    static {
        CATEGORY_KEYWORDS.put("TECH", Arrays.asList(
                "科技", "技术", "互联网", "编程", "代码", "AI", "人工智能", "机器学习", "深度学习",
                "算法", "数据", "大数据", "云计算", "区块链", "元宇宙", "VR", "AR", "虚拟现实",
                "芯片", "半导体", "软件", "硬件", "黑客", "极客", "创新", "创业", "产品",
                "程序员", "工程师", "开发", "前端", "后端", "运维", "测试", "架构"
        ));
        CATEGORY_KEYWORDS.put("BUSINESS", Arrays.asList(
                "商业", "财经", "金融", "投资", "理财", "股票", "基金", "经济", "市场",
                "创业", "公司", "企业", "管理", "职场", "晋升", "加薪", "跳槽", "行业",
                "趋势", "风口", "红利", "商业模式", "盈利", "增长", "战略", "品牌",
                "营销", "销售", "客户", "用户", "运营", "增长黑客", "KPI", "OKR"
        ));
        CATEGORY_KEYWORDS.put("HEALTH", Arrays.asList(
                "健康", "医疗", "医学", "医生", "医院", "养生", "健身", "运动", "减肥",
                "塑形", "瑜伽", "跑步", "心理", "心理咨询", "情绪", "压力", "焦虑",
                "抑郁", "睡眠", "饮食", "营养", "保健品", "中医", "中药", "西医",
                "体检", "疾病", "治疗", "康复", "免疫力", "新陈代谢", "生物钟"
        ));
        CATEGORY_KEYWORDS.put("EDUCATION", Arrays.asList(
                "教育", "学习", "读书", "知识", "认知", "思维", "成长", "进步", "提升",
                "大学", "考研", "留学", "英语", "外语", "考试", "证书", "技能", "培训",
                "课程", "讲座", "分享", "干货", "方法论", "高效", "时间管理", "专注力",
                "记忆", "智商", "情商", "逆商", "学习方法", "知识付费"
        ));
        CATEGORY_KEYWORDS.put("LIFESTYLE", Arrays.asList(
                "生活", "旅行", "美食", "探店", "咖啡", "茶", "家居", "装修", "时尚",
                "穿搭", "美妆", "护肤", "摄影", "电影", "音乐", "艺术", "文化", "历史",
                "读书", "小说", "散文", "诗歌", "哲学", "人生", "感悟", "情感",
                "恋爱", "婚姻", "家庭", "亲子", "友情", "社交", "人际关系"
        ));
        CATEGORY_KEYWORDS.put("NATURE", Arrays.asList(
                "自然", "环境", "生态", "动物", "植物", "森林", "海洋", "山川", "河流",
                "湖泊", "草原", "沙漠", "冰川", "雪山", "星空", "宇宙", "地球", "环保",
                "低碳", "可持续", "绿色", "有机", "户外", "徒步", "露营", "登山",
                "探险", "野生动植物", "生物多样性", "气候", "天气"
        ));
        CATEGORY_KEYWORDS.put("SPORTS", Arrays.asList(
                "运动", "体育", "健身", "跑步", "马拉松", "篮球", "足球", "羽毛球",
                "乒乓球", "网球", "游泳", "瑜伽", "普拉提", " CrossFit", "撸铁", "肌肉",
                "减脂", "增肌", "体能", "耐力", "速度", "力量", "柔韧性", "协调性",
                "比赛", "赛事", "奥运", "世界杯", "NBA", "冠军", "竞技"
        ));
        CATEGORY_KEYWORDS.put("ENTERTAINMENT", Arrays.asList(
                "娱乐", "综艺", "明星", "八卦", "影视", "电影", "电视剧", "网剧",
                "音乐", "歌曲", "歌手", "乐队", "演唱会", "音乐节", "游戏", "电竞",
                "动漫", "二次元", "cosplay", "小说", "网文", "IP", "改编", "剧本杀",
                "密室逃脱", "脱口秀", "喜剧", "相声", "小品", "魔术", "杂技"
        ));

        CATEGORY_VISUAL_THEMES.put("TECH", VisualTheme.builder()
                .primaryColors(Arrays.asList("#1E3A8A", "#0F172A", "#1E40AF", "#3B82F6"))
                .secondaryColors(Arrays.asList("#60A5FA", "#93C5FD", "#BFDBFE", "#1E293B"))
                .accentColors(Arrays.asList("#06B6D4", "#22D3EE", "#67E8F9", "#8B5CF6"))
                .decorationType("CIRCUITS")
                .backgroundStyle("GRADIENT_DIAGONAL")
                .build());
        CATEGORY_VISUAL_THEMES.put("BUSINESS", VisualTheme.builder()
                .primaryColors(Arrays.asList("#0F766E", "#115E59", "#134E4A", "#0F172A"))
                .secondaryColors(Arrays.asList("#14B8A6", "#2DD4BF", "#5EEAD4", "#99F6E4"))
                .accentColors(Arrays.asList("#F59E0B", "#FBBF24", "#FCD34D", "#FDE68A"))
                .decorationType("GEOMETRIC")
                .backgroundStyle("SOLID_ACCENT")
                .build());
        CATEGORY_VISUAL_THEMES.put("HEALTH", VisualTheme.builder()
                .primaryColors(Arrays.asList("#059669", "#047857", "#065F46", "#064E3B"))
                .secondaryColors(Arrays.asList("#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5"))
                .accentColors(Arrays.asList("#EC4899", "#F472B6", "#F9A8D4", "#FBCFE8"))
                .decorationType("HEARTBEAT")
                .backgroundStyle("SOFT_GRADIENT")
                .build());
        CATEGORY_VISUAL_THEMES.put("EDUCATION", VisualTheme.builder()
                .primaryColors(Arrays.asList("#7C3AED", "#6D28D9", "#5B21B6", "#4C1D95"))
                .secondaryColors(Arrays.asList("#A78BFA", "#8B5CF6", "#C4B5FD", "#DDD6FE"))
                .accentColors(Arrays.asList("#F59E0B", "#FBBF24", "#FCD34D", "#FEF3C7"))
                .decorationType("BOOKS")
                .backgroundStyle("RADIAL_GRADIENT")
                .build());
        CATEGORY_VISUAL_THEMES.put("LIFESTYLE", VisualTheme.builder()
                .primaryColors(Arrays.asList("#DB2777", "#BE185D", "#9D174D", "#831843"))
                .secondaryColors(Arrays.asList("#F472B6", "#F9A8D4", "#FBCFE8", "#FCE7F3"))
                .accentColors(Arrays.asList("#F97316", "#FB923C", "#FDBA74", "#FED7AA"))
                .decorationType("BUBBLES")
                .backgroundStyle("WARM_GRADIENT")
                .build());
        CATEGORY_VISUAL_THEMES.put("NATURE", VisualTheme.builder()
                .primaryColors(Arrays.asList("#059669", "#047857", "#166534", "#14532D"))
                .secondaryColors(Arrays.asList("#4ADE80", "#86EFAC", "#BBF7D0", "#DCFCE7"))
                .accentColors(Arrays.asList("#84CC16", "#A3E635", "#BEF264", "#D9F99D"))
                .decorationType("LEAVES")
                .backgroundStyle("NATURE_GRADIENT")
                .build());
        CATEGORY_VISUAL_THEMES.put("SPORTS", VisualTheme.builder()
                .primaryColors(Arrays.asList("#DC2626", "#B91C1C", "#991B1B", "#7F1D1D"))
                .secondaryColors(Arrays.asList("#F87171", "#FCA5A5", "#FECACA", "#FEE2E2"))
                .accentColors(Arrays.asList("#2563EB", "#3B82F6", "#60A5FA", "#93C5FD"))
                .decorationType("DIAGONAL_LINES")
                .backgroundStyle("DYNAMIC_GRADIENT")
                .build());
        CATEGORY_VISUAL_THEMES.put("ENTERTAINMENT", VisualTheme.builder()
                .primaryColors(Arrays.asList("#7C2D12", "#9A3412", "#B45309", "#D97706"))
                .secondaryColors(Arrays.asList("#FB923C", "#FDBA74", "#FED7AA", "#FFEDD5"))
                .accentColors(Arrays.asList("#EC4899", "#F472B6", "#F9A8D4", "#FBCFE8"))
                .decorationType("STARS")
                .backgroundStyle("SPOTLIGHT")
                .build());
    }

    public List<String> extractKeywords(String text) {
        if (text == null || text.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, Integer> categoryScores = new HashMap<>();

        for (Map.Entry<String, List<String>> entry : CATEGORY_KEYWORDS.entrySet()) {
            String category = entry.getKey();
            List<String> keywords = entry.getValue();
            int score = 0;
            String lowerText = text.toLowerCase();
            for (String keyword : keywords) {
                if (lowerText.contains(keyword.toLowerCase())) {
                    score++;
                }
            }
            if (score > 0) {
                categoryScores.put(category, score);
            }
        }

        List<String> sortedCategories = categoryScores.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        return sortedCategories;
    }

    public VisualTheme getVisualTheme(String text, String styleKey) {
        List<String> categories = extractKeywords(text);
        String primaryCategory = categories.isEmpty() ? "LIFESTYLE" : categories.get(0);
        VisualTheme theme = CATEGORY_VISUAL_THEMES.get(primaryCategory);
        if (theme == null) {
            theme = CATEGORY_VISUAL_THEMES.get("LIFESTYLE");
        }

        VisualTheme finalTheme = theme;
        return VisualTheme.builder()
                .primaryColor(getColorByStyle(theme.getPrimaryColors(), styleKey, 0))
                .secondaryColor(getColorByStyle(theme.getSecondaryColors(), styleKey, 1))
                .accentColor(getColorByStyle(theme.getAccentColors(), styleKey, 0))
                .decorationType(theme.getDecorationType())
                .backgroundStyle(theme.getBackgroundStyle())
                .primaryCategory(primaryCategory)
                .categories(categories)
                .build();
    }

    private String getColorByStyle(List<String> colors, String styleKey, int defaultIndex) {
        if (colors == null || colors.isEmpty()) {
            return "#2563EB";
        }
        int index = defaultIndex;
        if (styleKey != null) {
            index = Math.abs(styleKey.hashCode()) % colors.size();
        }
        return colors.get(index);
    }

    public static class VisualTheme {
        private String primaryColor;
        private String secondaryColor;
        private String accentColor;
        private String decorationType;
        private String backgroundStyle;
        private String primaryCategory;
        private List<String> categories;
        private List<String> primaryColors;
        private List<String> secondaryColors;
        private List<String> accentColors;

        public VisualTheme() {}

        public static VisualThemeBuilder builder() {
            return new VisualThemeBuilder();
        }

        public String getPrimaryColor() { return primaryColor; }
        public void setPrimaryColor(String primaryColor) { this.primaryColor = primaryColor; }

        public String getSecondaryColor() { return secondaryColor; }
        public void setSecondaryColor(String secondaryColor) { this.secondaryColor = secondaryColor; }

        public String getAccentColor() { return accentColor; }
        public void setAccentColor(String accentColor) { this.accentColor = accentColor; }

        public String getDecorationType() { return decorationType; }
        public void setDecorationType(String decorationType) { this.decorationType = decorationType; }

        public String getBackgroundStyle() { return backgroundStyle; }
        public void setBackgroundStyle(String backgroundStyle) { this.backgroundStyle = backgroundStyle; }

        public String getPrimaryCategory() { return primaryCategory; }
        public void setPrimaryCategory(String primaryCategory) { this.primaryCategory = primaryCategory; }

        public List<String> getCategories() { return categories; }
        public void setCategories(List<String> categories) { this.categories = categories; }

        public List<String> getPrimaryColors() { return primaryColors; }
        public void setPrimaryColors(List<String> primaryColors) { this.primaryColors = primaryColors; }

        public List<String> getSecondaryColors() { return secondaryColors; }
        public void setSecondaryColors(List<String> secondaryColors) { this.secondaryColors = secondaryColors; }

        public List<String> getAccentColors() { return accentColors; }
        public void setAccentColors(List<String> accentColors) { this.accentColors = accentColors; }

        public static class VisualThemeBuilder {
            private final VisualTheme theme = new VisualTheme();

            public VisualThemeBuilder primaryColor(String primaryColor) {
                theme.primaryColor = primaryColor;
                return this;
            }

            public VisualThemeBuilder secondaryColor(String secondaryColor) {
                theme.secondaryColor = secondaryColor;
                return this;
            }

            public VisualThemeBuilder accentColor(String accentColor) {
                theme.accentColor = accentColor;
                return this;
            }

            public VisualThemeBuilder decorationType(String decorationType) {
                theme.decorationType = decorationType;
                return this;
            }

            public VisualThemeBuilder backgroundStyle(String backgroundStyle) {
                theme.backgroundStyle = backgroundStyle;
                return this;
            }

            public VisualThemeBuilder primaryCategory(String primaryCategory) {
                theme.primaryCategory = primaryCategory;
                return this;
            }

            public VisualThemeBuilder categories(List<String> categories) {
                theme.categories = categories;
                return this;
            }

            public VisualThemeBuilder primaryColors(List<String> primaryColors) {
                theme.primaryColors = primaryColors;
                return this;
            }

            public VisualThemeBuilder secondaryColors(List<String> secondaryColors) {
                theme.secondaryColors = secondaryColors;
                return this;
            }

            public VisualThemeBuilder accentColors(List<String> accentColors) {
                theme.accentColors = accentColors;
                return this;
            }

            public VisualTheme build() {
                return theme;
            }
        }
    }
}
