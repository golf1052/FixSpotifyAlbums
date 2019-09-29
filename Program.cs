using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace FixSpotifyAlbums
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateWebHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateWebHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.ConfigureKestrel(serverOptions =>
                    {
                    })
                    .UseStartup<Startup>()
                    .UseUrls("http://127.0.0.1:8896");
                });
    }
}
