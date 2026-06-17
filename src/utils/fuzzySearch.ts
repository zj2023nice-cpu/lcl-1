export interface SearchMatch {
  start: number;
  end: number;
}

export interface FuzzySearchResult {
  cueId: string;
  startTime: number;
  endTime: number;
  text: string;
  speakerName?: string;
  matches: SearchMatch[];
  score: number;
}

const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const findAllMatches = (text: string, keyword: string): SearchMatch[] => {
  const matches: SearchMatch[] = [];
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  let index = 0;
  while ((index = lowerText.indexOf(lowerKeyword, index)) !== -1) {
    matches.push({
      start: index,
      end: index + keyword.length,
    });
    index += keyword.length;
  }

  return matches;
};

const findFuzzyMatches = (text: string, keyword: string, threshold: number = 0.6): SearchMatch[] => {
  if (!keyword || keyword.length === 0) return [];
  if (text.length < keyword.length) return [];

  const matches: SearchMatch[] = [];
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  const exactMatches = findAllMatches(text, keyword);
  if (exactMatches.length > 0) {
    return exactMatches;
  }

  const keywordLen = lowerKeyword.length;
  const windowSize = Math.min(keywordLen * 2, text.length);

  for (let i = 0; i <= lowerText.length - keywordLen; i++) {
    const window = lowerText.slice(i, i + windowSize);
    const distance = levenshteinDistance(lowerKeyword, window.slice(0, keywordLen));
    const similarity = 1 - distance / Math.max(keywordLen, window.length);

    if (similarity >= threshold) {
      let bestMatchStart = i;
      let bestMatchEnd = i + keywordLen;
      let bestSimilarity = similarity;

      for (let len = Math.max(1, keywordLen - 2); len <= Math.min(windowSize, keywordLen + 2); len++) {
        for (let offset = -2; offset <= 2; offset++) {
          const start = i + offset;
          if (start < 0 || start + len > text.length) continue;
          const substr = lowerText.slice(start, start + len);
          const dist = levenshteinDistance(lowerKeyword, substr);
          const sim = 1 - dist / Math.max(keywordLen, len);
          if (sim > bestSimilarity) {
            bestSimilarity = sim;
            bestMatchStart = start;
            bestMatchEnd = start + len;
          }
        }
      }

      const overlaps = matches.some(
        (m) => bestMatchStart < m.end && bestMatchEnd > m.start
      );

      if (!overlaps) {
        matches.push({
          start: bestMatchStart,
          end: bestMatchEnd,
        });
      }
    }
  }

  if (matches.length === 0 && threshold > 0.4) {
    return findFuzzyMatches(text, keyword, threshold - 0.1);
  }

  return matches;
};

export const fuzzySearch = (
  cues: Array<{
    id: string;
    startTime: number;
    endTime: number;
    text: string;
    speakerName?: string;
  }>,
  keyword: string,
  options?: {
    threshold?: number;
    includeSpeaker?: boolean;
  }
): FuzzySearchResult[] => {
  if (!keyword || keyword.trim() === '') return [];

  const trimmedKeyword = keyword.trim();
  const threshold = options?.threshold ?? 0.6;
  const includeSpeaker = options?.includeSpeaker ?? true;

  const results: FuzzySearchResult[] = [];

  for (const cue of cues) {
    const textMatches = findFuzzyMatches(cue.text, trimmedKeyword, threshold);
    const speakerMatches =
      includeSpeaker && cue.speakerName
        ? findFuzzyMatches(cue.speakerName, trimmedKeyword, threshold)
        : [];

    const allMatches = [...textMatches, ...speakerMatches];

    if (allMatches.length > 0) {
      const exactMatchCount = textMatches.filter(
        (m) => cue.text.slice(m.start, m.end).toLowerCase() === trimmedKeyword.toLowerCase()
      ).length;

      const score =
        exactMatchCount * 100 +
        textMatches.length * 50 +
        speakerMatches.length * 25 +
        (textMatches.length > 0 ? 10 : 0);

      results.push({
        cueId: cue.id,
        startTime: cue.startTime,
        endTime: cue.endTime,
        text: cue.text,
        speakerName: cue.speakerName,
        matches: allMatches.sort((a, b) => a.start - b.start),
        score,
      });
    }
  }

  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.startTime - b.startTime;
  });
};

export const highlightText = (
  text: string,
  matches: SearchMatch[],
  highlightClassName: string = 'bg-yellow-500/40 text-yellow-200 px-0.5 rounded'
): Array<{ text: string; isHighlight: boolean }> => {
  if (matches.length === 0) {
    return [{ text, isHighlight: false }];
  }

  const sortedMatches = [...matches].sort((a, b) => a.start - b.start);
  const segments: Array<{ text: string; isHighlight: boolean }> = [];

  let lastIndex = 0;

  for (const match of sortedMatches) {
    if (match.start > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.start),
        isHighlight: false,
      });
    }

    segments.push({
      text: text.slice(match.start, match.end),
      isHighlight: true,
    });

    lastIndex = match.end;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isHighlight: false,
    });
  }

  return segments;
};
