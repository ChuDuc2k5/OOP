using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pharmacy.Api.Infrastructure;
using Pharmacy.Core.Common;
namespace Pharmacy.Tests;

public sealed class ErrorTests
{
    [Theory]
    [InlineData("VALIDATION_FAILED", 400)]
    [InlineData("FILE_INVALID", 400)]
    [InlineData("INVALID_CREDENTIALS", 401)]
    [InlineData("UNAUTHENTICATED", 401)]
    [InlineData("FORBIDDEN", 403)]
    [InlineData("NOT_FOUND", 404)]
    [InlineData("DUPLICATE", 409)]
    [InlineData("CONCURRENCY_CONFLICT", 409)]
    public async Task BusinessException_MapsContractCodeFieldsAndData(string code, int status)
    {
        var context = new DefaultHttpContext(); context.Response.Body = new MemoryStream();
        var middleware = new ApiExceptionMiddleware(_ => throw new BusinessException(code, "Thông báo", "username", new { value = 1 }), NullLogger<ApiExceptionMiddleware>.Instance);
        await middleware.InvokeAsync(context); context.Response.Body.Position = 0;
        var json = await JsonSerializer.DeserializeAsync<JsonElement>(context.Response.Body);
        Assert.Equal(status, context.Response.StatusCode); Assert.Equal(code, json.GetProperty("code").GetString()); Assert.Equal("Thông báo", json.GetProperty("errors").GetProperty("username")[0].GetString()); Assert.Equal(1, json.GetProperty("data").GetProperty("value").GetInt32());
    }
    [Fact]
    public async Task UnexpectedException_DoesNotExposeStackTraceOrInternalMessage()
    {
        var context = new DefaultHttpContext(); context.Response.Body = new MemoryStream();
        var middleware = new ApiExceptionMiddleware(_ => throw new InvalidOperationException("Sensitive internal value"), NullLogger<ApiExceptionMiddleware>.Instance);
        await middleware.InvokeAsync(context); context.Response.Body.Position = 0;
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync(); Assert.Equal(500, context.Response.StatusCode); Assert.Contains("INTERNAL_ERROR", body); Assert.DoesNotContain("Sensitive", body); Assert.DoesNotContain("stackTrace", body);
    }
    [Fact]
    public async Task DbConcurrencyException_ReturnsConflict()
    {
        var context = new DefaultHttpContext(); context.Response.Body = new MemoryStream();
        var middleware = new ApiExceptionMiddleware(_ => throw new DbUpdateConcurrencyException(), NullLogger<ApiExceptionMiddleware>.Instance);
        await middleware.InvokeAsync(context); context.Response.Body.Position = 0;
        Assert.Equal(409, context.Response.StatusCode); Assert.Contains("CONCURRENCY_CONFLICT", await new StreamReader(context.Response.Body).ReadToEndAsync());
    }
}
