package com.podcast.collab.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubtitleCueUpdateRequest {

    @NotNull(message = "开始时间不能为空")
    @DecimalMin(value = "0", message = "开始时间不能小于0")
    private BigDecimal startTime;

    @NotNull(message = "结束时间不能为空")
    @DecimalMin(value = "0", message = "结束时间不能小于0")
    private BigDecimal endTime;

    @NotBlank(message = "字幕文本不能为空")
    private String text;

    private String speakerId;

    private String speakerName;
}
