Referral Performance Test SBT 
=========================
based on:
https://github.com/gatling/gatling-sbt-plugin-demo.git 

Gatling test for braze referral storage. 

Get the project
---------------

Start SBT
---------
```bash
$ sbt
```

Run locally - in sbt shell
-------------------

```sbt shell
> gatling:test
```

Run on ec2
-------------------

Running on an ec2 avoids local performance constraints.

- SSH onto a box
`ssm ssh --profile membership --bastion-tags contributions-store-bastion,support,PROD -x -i <instance id from aws>`
- curl  gatling script runner and unzip it
-- `curl https://repo1.maven.org/maven2/io/gatling/highcharts/gatling-charts-highcharts-bundle/3.3.1/gatling-charts-highcharts-bundle-3.3.1-bundle.zip`
-- `unzip gatling-charts-highcharts-bundle-3.3.1.zip`
- paste the script from this repo (`src/test/scala/BasicSimulation.scala`) into `gatling-charts-highcharts-bundle-3.3.1/user-files/simulations`
-- Run using `gatling-charts-highcharts-bundle-3.3.1/bin/gatling.sh`


```bash
> gatling:test
```

