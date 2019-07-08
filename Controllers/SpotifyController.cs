using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FixSpotifyAlbums
{
    [Route("api/[controller]")]
    public class SpotifyController : Controller
    {
        private const string SpotifyTokenUrl = "https://accounts.spotify.com/api/token";
        private HttpClient httpClient;
        public SpotifyController()
        {
            httpClient = new HttpClient();
        }

        [HttpGet]
        public async Task<IActionResult> HandleRedirect([FromQuery] string code, [FromQuery] string state = null, [FromQuery] string error = null)
        {
            if (!string.IsNullOrEmpty(error))
            {
                return LocalRedirect($"/#error={error}");
            }
            FormUrlEncodedContent tokenRequestContent = new FormUrlEncodedContent(new Dictionary<string, string>()
            {
                { "grant_type", "authorization_code" },
                { "code", code },
                { "redirect_uri", Secrets.RedirectUrl }
            });
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic",
                GetEncodedAuth(Secrets.SpotifyClientId, Secrets.SpotifyClientSecret));
            HttpResponseMessage responseMessage = await httpClient.PostAsync(SpotifyTokenUrl, tokenRequestContent);
            if (!responseMessage.IsSuccessStatusCode)
            {
                return LocalRedirect($"/#error={await responseMessage.Content.ReadAsStringAsync()}");
            }
            SpotifyAuthorizationResponse response = JsonConvert.DeserializeObject<SpotifyAuthorizationResponse>(await responseMessage.Content.ReadAsStringAsync());
            return LocalRedirect($"/#accessToken={response.AccessToken}");
        }

        private string GetEncodedAuth(string clientId, string clientSecret)
        {
            return Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
        }
    }
}
