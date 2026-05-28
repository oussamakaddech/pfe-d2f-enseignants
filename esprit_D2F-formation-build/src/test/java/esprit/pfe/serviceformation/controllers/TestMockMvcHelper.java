package esprit.pfe.serviceformation.controllers;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import org.springframework.mock.web.MockMultipartFile;

import java.util.List;

public final class TestMockMvcHelper {

    private TestMockMvcHelper() {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public abstract static class PageImplMixin<T> {
        @JsonCreator
        public PageImplMixin(
                @JsonProperty("content") List<T> content,
                @JsonProperty("number") int number,
                @JsonProperty("size") int size,
                @JsonProperty("totalElements") long totalElements) {
        }
    }

    public static MockMultipartFile createValidExcelFile(String fieldName, String filename, String content) {
        byte[] magicBytes = {0x50, 0x4B, 0x03, 0x04};
        byte[] contentBytes = content.getBytes();
        byte[] fileContent = new byte[magicBytes.length + contentBytes.length];
        System.arraycopy(magicBytes, 0, fileContent, 0, magicBytes.length);
        System.arraycopy(contentBytes, 0, fileContent, magicBytes.length, contentBytes.length);
        return new MockMultipartFile(fieldName, filename,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileContent);
    }

    public static MockMultipartFile createEmptyExcelFile(String fieldName, String filename) {
        byte[] magicBytes = {0x50, 0x4B, 0x03, 0x04};
        return new MockMultipartFile(fieldName, filename,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", magicBytes);
    }

    public static MockMvc buildMockMvc(Object... controllers) {
        ObjectMapper mapper = new ObjectMapper();
        mapper.addMixIn(PageImpl.class, PageImplMixin.class);
        mapper.registerModule(new org.springframework.data.web.config.SpringDataJacksonConfiguration.PageModule(
            new org.springframework.data.web.config.SpringDataWebSettings(
                org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.DIRECT)));
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter(mapper);
        return MockMvcBuilders.standaloneSetup(controllers)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
            .setMessageConverters(
                new ByteArrayHttpMessageConverter(),
                new StringHttpMessageConverter(),
                converter)
                .build();
    }
}
