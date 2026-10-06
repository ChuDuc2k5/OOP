namespace Pharmacy.Api.Infrastructure;

public static class EnvironmentFile
{
    public static Dictionary<string, string?> Read(string path)
    {
        var values = new Dictionary<string, string?>();
        if (!File.Exists(path))
        {
            return values;
        }
        foreach (var line in File.ReadLines(path))
        {
            var text = line.Trim();
            if (text.Length == 0 || text.StartsWith('#'))
            {
                continue;
            }
            var separator = text.IndexOf('=');
            if (separator <= 0)
            {
                throw new InvalidOperationException("Invalid .env assignment.");
            }
            var name = text[..separator].Trim();
            var value = text[(separator + 1)..].Trim();
            if (value.Length >= 2 && (value[0] == '"' && value[^1] == '"' || value[0] == '\'' && value[^1] == '\''))
            {
                value = value[1..^1];
            }
            if (value.Length > 0)
            {
                values[name.Replace("__", ":")] = value;
            }
        }
        return values;
    }
}
