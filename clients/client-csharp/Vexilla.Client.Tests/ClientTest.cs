using System.Net.Http;
using System.Threading.Tasks;
using Xunit;
using Xunit.Abstractions;

namespace Vexilla.Client.Tests
{
    public class ClientTest
    {
        private readonly ITestOutputHelper _output;

        public ClientTest(ITestOutputHelper output)
        {
            _output = output;
        }

        [Fact]
        public async Task ClientWorksTest()
        {
            var client = new VexillaClientBase(
                "http://localhost:3000",
                "dev",
                "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
            );

            var httpClient = new HttpClient();

            await client.SyncManifest(async url =>
            {
                var result = await httpClient.GetAsync(url);
                var resultContent = await result.Content.ReadAsStringAsync();
                return resultContent;
            });

            await client.SyncFlags("Gradual", async url =>
            {
                var result = await httpClient.GetAsync(url);
                var resultContent = await result.Content.ReadAsStringAsync();
                return resultContent;
            });

            var shouldGradual =
                client.Should("Gradual", "testingWorkingGradual");

            Assert.True(shouldGradual);

            var shouldNotGradual =
                client.Should("Gradual", "testingNonWorkingGradual");

            Assert.False(shouldNotGradual);
        }
    }
}