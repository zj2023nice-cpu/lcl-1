package com.podcast.collab.service.asr;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Slf4j
@Service
public class MockAsrService implements AsrService {

    private static final Set<String> SUPPORTED_LANGUAGES = Set.of(
            "zh-CN", "zh-TW", "en-US", "en-GB", "ja-JP", "ko-KR",
            "fr-FR", "de-DE", "es-ES", "ru-RU", "ar-SA", "hi-IN"
    );

    private static final Map<String, String[]> MOCK_SPEAKERS = Map.of(
            "zh-CN", new String[]{"主持人", "嘉宾A", "嘉宾B"},
            "en-US", new String[]{"Host", "Guest A", "Guest B"},
            "ja-JP", new String[]{"司会者", "ゲストA", "ゲストB"},
            "ko-KR", new String[]{"진행자", "게스트A", "게스트B"}
    );

    private static final Map<String, String[]> MOCK_TEXTS = Map.of(
            "zh-CN", new String[]{
                    "大家好，欢迎收听今天的播客节目。",
                    "今天我们来聊聊人工智能的最新发展。",
                    "首先，让我们介绍一下今天的嘉宾。",
                    "非常高兴能够来到这里和大家分享。",
                    "人工智能正在改变我们的生活方式。",
                    "从自动驾驶到智能助手，应用越来越广泛。",
                    "但同时也带来了一些伦理和安全问题。",
                    "我们需要平衡技术发展和风险控制。",
                    "接下来我们来讨论具体的应用案例。",
                    "感谢大家的收听，我们下期再见。"
            },
            "en-US", new String[]{
                    "Hello everyone, welcome to today's podcast.",
                    "Today we're talking about the latest developments in AI.",
                    "First, let's introduce our guest for today.",
                    "I'm very happy to be here and share with everyone.",
                    "Artificial intelligence is changing our way of life.",
                    "From self-driving cars to smart assistants, applications are growing.",
                    "But it also brings some ethical and safety issues.",
                    "We need to balance technological development and risk control.",
                    "Let's discuss specific application cases next.",
                    "Thank you for listening, see you next time."
            },
            "ja-JP", new String[]{
                    "皆さん、こんにちは。今日のポッドキャストへようこそ。",
                    "今日は人工知能の最新の発展についてお話しします。",
                    "まず、今日のゲストを紹介しましょう。",
                    "ここに来て皆さんと共有できてとても嬉しいです。",
                    "人工知能は私たちの生活様式を変えています。",
                    "自動運転からスマートアシスタントまで、応用はますます広がっています。",
                    "しかし同時に、いくつかの倫理的および安全上の問題ももたらしています。",
                    "技術の発展とリスク管理のバランスを取る必要があります。",
                    "次に具体的な応用例について議論しましょう。",
                    "聴いてくださってありがとうございます。また次回お会いしましょう。"
            },
            "ko-KR", new String[]{
                    "안녕하세요, 오늘의 팟캐스트에 오신 것을 환영합니다.",
                    "오늘은 인공지능의 최신 발전에 대해 이야기해 봅시다.",
                    "먼저, 오늘의 게스트를 소개하겠습니다.",
                    "여기에 와서 여러분과 공유할 수 있어서 매우 기쁩니다.",
                    "인공지능은 우리의 생활 방식을 바꾸고 있습니다.",
                    "자율주행부터 스마트 어시스턴트까지 응용이 점점 넓어지고 있습니다.",
                    "하지만 동시에 일부 윤리적 및 안전 문제도 가져옵니다.",
                    "우리는 기술 발전과 위험 관리의 균형을 맞춰야 합니다.",
                    "다음으로 구체적인 응용 사례에 대해 논의해 봅시다.",
                    "들어주셔서 감사합니다. 다음에 뵙겠습니다."
            }
    );

    @Override
    public AsrResult transcribe(File audioFile, String language, boolean detectSpeakers) throws Exception {
        log.info("使用模拟ASR服务进行语音识别，语言: {}, 说话人检测: {}", language, detectSpeakers);

        String actualLanguage = isLanguageSupported(language) ? language : "zh-CN";
        String[] texts = MOCK_TEXTS.getOrDefault(actualLanguage, MOCK_TEXTS.get("zh-CN"));
        String[] speakers = MOCK_SPEAKERS.getOrDefault(actualLanguage, MOCK_SPEAKERS.get("zh-CN"));

        Random random = new Random(42);
        List<AsrResult.AsrCue> cues = new ArrayList<>();

        BigDecimal currentTime = BigDecimal.ZERO;
        for (int i = 0; i < texts.length; i++) {
            String text = texts[i];
            double duration = 3.0 + random.nextDouble() * 4.0;
            BigDecimal startTime = currentTime;
            BigDecimal endTime = currentTime.add(BigDecimal.valueOf(duration)).setScale(3, RoundingMode.HALF_UP);

            AsrResult.AsrCue.AsrCueBuilder cueBuilder = AsrResult.AsrCue.builder()
                    .startTime(startTime)
                    .endTime(endTime)
                    .text(text)
                    .confidence(BigDecimal.valueOf(0.85 + random.nextDouble() * 0.14).setScale(4, RoundingMode.HALF_UP));

            if (detectSpeakers) {
                String speakerId = "SPEAKER_" + (i % 3);
                String speakerName = speakers[i % speakers.length];
                cueBuilder.speakerId(speakerId).speakerName(speakerName);
            }

            cues.add(cueBuilder.build());
            currentTime = endTime;
        }

        Thread.sleep(1500);

        return AsrResult.builder()
                .language(actualLanguage)
                .cues(cues)
                .build();
    }

    @Override
    public Set<String> getSupportedLanguages() {
        return SUPPORTED_LANGUAGES;
    }

    @Override
    public boolean isLanguageSupported(String language) {
        return SUPPORTED_LANGUAGES.contains(language);
    }

    @Override
    public boolean isAvailable() {
        return true;
    }
}
