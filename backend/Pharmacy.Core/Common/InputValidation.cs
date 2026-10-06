namespace Pharmacy.Core.Common;

public sealed class InputValidationException(Dictionary<string, string[]> errors)
    : Exception("Dữ liệu không hợp lệ.")
{
    public Dictionary<string, string[]> Errors { get; } = errors;
}

public static class InputValidation
{
    public static void Pagination(int page, int pageSize)
    {
        var errors = new Dictionary<string, string[]>();
        if (page < 1 || (long)(page - 1) * pageSize > int.MaxValue)
        {
            errors["page"] = ["Trang phải là số nguyên dương hợp lệ."];
        }
        if (pageSize is < 1 or > 100)
        {
            errors["pageSize"] = ["Số dòng mỗi trang phải từ 1 đến 100."];
        }
        ThrowIfAny(errors);
    }

    public static void ThrowIfAny(Dictionary<string, string[]> errors)
    {
        if (errors.Count > 0)
        {
            throw new InputValidationException(errors);
        }
    }

    public static BusinessException NotFound() => new("NOT_FOUND", "Không tìm thấy dữ liệu.");
}
