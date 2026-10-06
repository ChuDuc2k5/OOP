using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Common;
using Pharmacy.Core.Services;
namespace Pharmacy.Api.Infrastructure;

public static class ApiErrors
{
    public static Task Write(
        HttpContext context,
        int status,
        string code,
        string title,
        object? errors = null,
        object? data = null)
    {
        var problem = new ProblemDetails { Status = status, Title = title };
        problem.Extensions["code"] = code;
        if (errors != null)
        {
            problem.Extensions["errors"] = errors;
        }

        if (data != null)
        {
            problem.Extensions["data"] = data;
        }

        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(problem, options: null, contentType: "application/problem+json");
    }
    public static int Status(string code) => code switch
    {
        "VALIDATION_FAILED" or "ANTIFORGERY_INVALID" or "FILE_INVALID" => 400,
        "INVALID_CREDENTIALS" or "UNAUTHENTICATED" => 401,
        "FORBIDDEN" => 403,
        "NOT_FOUND" => 404,
        "INTERNAL_ERROR" => 500,
        _ => 409
    };
}
public sealed class ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (InputValidationException e)
        {
            await ApiErrors.Write(context, 400, "VALIDATION_FAILED", e.Message, e.Errors);
        }
        catch (AccountValidationException e)
        {
            await ApiErrors.Write(context, 400, "VALIDATION_FAILED", e.Message, e.Errors);
        }
        catch (BusinessException e)
        {
            await ApiErrors.Write(context, ApiErrors.Status(e.Code), e.Code, e.Message, e.Field is null ? null : new Dictionary<string, string[]> { [e.Field] = [e.Message] }, e.Details);
        }
        catch (DbUpdateConcurrencyException e)
        {
            logger.LogWarning(e, "Database concurrency conflict");
            await ApiErrors.Write(context, 409, "CONCURRENCY_CONFLICT", "Dữ liệu đã thay đổi, vui lòng tải lại.");
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
        }
        catch (Exception e)
        {
            logger.LogError(e, "Unhandled API error");
            if (context.Response.HasStarted)
            {
                throw;
            }
            await ApiErrors.Write(context, 500, "INTERNAL_ERROR", "Đã xảy ra lỗi hệ thống.");
        }
    }
}
public sealed class CsrfMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IAntiforgery antiforgery)
    {
        if (context.Request.Path.StartsWithSegments("/api") && context.Request.Method is "POST" or "PUT" or "PATCH" or "DELETE")
        {
            try
            {
                await antiforgery.ValidateRequestAsync(context);
            }
            catch (AntiforgeryValidationException)
            {
                await ApiErrors.Write(context, 400, "ANTIFORGERY_INVALID", "Token bảo vệ yêu cầu không hợp lệ.");
                return;
            }
        }
        await next(context);
    }
}
public static class CsrfTokens
{
    public static void Issue(HttpContext context, IAntiforgery antiforgery)
    {
        var tokens = antiforgery.GetAndStoreTokens(context);
        context.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions { HttpOnly = false, Secure = context.Request.IsHttps, SameSite = SameSiteMode.Lax, Path = "/", IsEssential = true });
        context.Response.Headers.CacheControl = "no-store";
    }
}
