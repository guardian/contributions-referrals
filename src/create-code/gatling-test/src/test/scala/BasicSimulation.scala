import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

import scala.concurrent.duration.DurationInt

class BrazeReferralTest extends Simulation {

  val r = scala.util.Random
  def randomNumber = r.nextInt()

  def requestBody: String = s"""{
											|		"code": "$randomNumber",
											|		"email": "$randomNumber@gu.com",
											|		"source": "GATLING"
											|}""".stripMargin

  val httpProtocol = http
    .baseUrl("https://contribution-referrals-code.support.guardianapis.com")
    .acceptHeader("application/json")
    .acceptEncodingHeader("gzip, deflate")
    .acceptLanguageHeader("en-GB,en-US;q=0.9,en;q=0.8")
    .upgradeInsecureRequestsHeader("1")
    .userAgentHeader("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36")

  val scn = scenario("post referral code")
    .exec(http("Post")
      .post("/referral")
      .body(StringBody(s"""$requestBody""")).asJson
    )

  setUp(
    scn.inject(
      nothingFor(1 seconds),
      atOnceUsers(1),
      rampUsers(10) during (5 seconds),
      constantUsersPerSec(100) during (200 seconds)
    ).protocols(httpProtocol)
  )
}
