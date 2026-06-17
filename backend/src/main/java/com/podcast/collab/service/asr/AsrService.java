package com.podcast.collab.service.asr;

import java.io.File;
import java.util.Set;

public interface AsrService {

    AsrResult transcribe(File audioFile, String language, boolean detectSpeakers) throws Exception;

    Set<String> getSupportedLanguages();

    boolean isLanguageSupported(String language);

    boolean isAvailable();
}
