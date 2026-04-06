<template>
  <div class="about-view">
    <div class="container">
      <div class="content-wrapper">
        <header class="page-header">
          <h1>An Introduction to Rendezvous</h1>
        </header>

        <div class="intro-content">
          <p>
            Greetings brethren! Our family has enjoyed Roundhouse for 20 years
            now and plans to continue attending indefinitely, Lord willing. We
            appreciate the fellowship so much and look forward to it annually,
            despite the lengthy drive. We became aware of an alternative
            gathering for members of the Lord's church who home educate (e.g.,
            Roundup). We contemplated attending it but decided instead to launch
            an alternative here in Illinois near St. Louis. Our goal is to
            provide a 5 day / 4 night retreat filled with fellowship, worship,
            recreation, and encouragement for Christian families who educate
            their children at home.
          </p>

          <p>
            The first Rendezvous was in 2015 at Lake Williamson Christian Center
            (LWCC) in Carlinville, IL. The week went smoothly & was so much fun
            for young and old alike! We decided to make Rendezvous an annual
            event (always starting the first Monday in May).
          </p>

          <p>
            The LWCC facility is quite impressive. Let me encourage you to spend
            some time on their website:
            <a
              href="https://www.LakeWilliamson.org"
              target="_blank"
              rel="noopener"
              >www.LakeWilliamson.org</a
            >
            to see pictures, recreational options, etc. The facility has a lake
            and is surrounded by a residential area. It has a ton of recreational
            options (e.g., archery, mini golf, black-light dodgeball, nine
            square, basketball, volleyball, wallyball, obstacle course, rock
            climbing wall, indoor pool, kickball, softball, disc golf, canoeing,
            ping pong, billiards, zip line, and more!) and can accommodate groups
            of 1500 people. LWCC is designed as a retreat center and they do all
            the cooking. They have a nice dining hall that can seat 500 people at
            one time. The meals are all buffet style (a couple entrees and sides
            are offered with each meal, along with a full salad bar, desserts,
            and drinks). Not having to prepare meals or clean-up afterward is a
            real treat; it simplifies things and allows more time for visiting
            and activities. There are several lodging options: motel, RV, or tent
            camping. Each motel room can sleep up to 6 people (either 2 queen
            beds plus 1 bunk bed or 1 queen bed plus 2 bunk beds—your choice).
            The motel rooms are basic but provide all linens and a private
            bathroom. The RVers & tent campers use the shower rooms at the indoor
            pool as needed (about 100 yards away).
          </p>

          <p>
            If you need to do laundry while there, there are washers and dryers
            available.
          </p>

          <p>
            If you know of others who may be interested in attending, please
            direct them to our website and Facebook group. The Facebook group is
            "closed" for privacy, but you are encouraged to invite and add anyone
            to it you think may be interested.
          </p>

          <p>
            Website:
            <a
              href="https://www.RendezvousIL.com"
              target="_blank"
              rel="noopener"
              >www.RendezvousIL.com</a
            ><br />
            Facebook group:
            <a
              href="https://www.facebook.com/groups/RendezvousIL"
              target="_blank"
              rel="noopener"
              >www.facebook.com/groups/RendezvousIL</a
            >
          </p>

          <p>
            If you have any questions or concerns, please contact us.<br />
            Grace & peace,
          </p>

          <p class="signature">
            Stephen & Ranae Bradd<br />
            824 W. Main St.<br />
            Clinton, IL 61727<br />
            <a href="tel:2179355058">(217)935-5058</a><br />
            <a href="mailto:Stephen@Bradd.us">Stephen@Bradd.us</a>
          </p>
        </div>

        <section class="history-section">
          <h2>Rendezvous History</h2>
          <div class="table-wrapper">
            <table class="history-table">
              <thead>
                <tr>
                  <th>YEAR</th>
                  <th>ATTENDEES</th>
                  <th>THEME</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2015</td>
                  <td>50</td>
                  <td>Matthew</td>
                </tr>
                <tr>
                  <td>2016</td>
                  <td>52</td>
                  <td>John</td>
                </tr>
                <tr>
                  <td>2017</td>
                  <td>63</td>
                  <td>Acts</td>
                </tr>
                <tr>
                  <td>2018</td>
                  <td>92</td>
                  <td>Genesis</td>
                </tr>
                <tr>
                  <td>2019</td>
                  <td>73</td>
                  <td>Exodus</td>
                </tr>
                <tr>
                  <td>2020</td>
                  <td>82</td>
                  <td>Lev, Num, & Deut</td>
                </tr>
                <tr>
                  <td>2021</td>
                  <td>129</td>
                  <td>Romans</td>
                </tr>
                <tr>
                  <td>2022</td>
                  <td>138</td>
                  <td>1 Corinthians</td>
                </tr>
                <tr>
                  <td>2023</td>
                  <td>174</td>
                  <td>2 Corinthians</td>
                </tr>
                <tr>
                  <td>2024</td>
                  <td>124</td>
                  <td>Joshua</td>
                </tr>
                <tr>
                  <td>2025</td>
                  <td>?</td>
                  <td>Judges</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AboutView'
}
</script>

<style scoped>
.page-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.page-header h1 {
  color: var(--color-primary);
}

.intro-content p {
  font-size: var(--font-size-lg);
  line-height: 1.8;
  margin-bottom: var(--space-lg);
}

.signature {
  font-style: italic;
  color: var(--color-text-light);
}

.history-section {
  margin-top: var(--space-3xl);
  padding-top: var(--space-2xl);
  border-top: 2px solid var(--color-border);
}

.history-section h2 {
  text-align: center;
  color: var(--color-primary);
  margin-bottom: var(--space-xl);
}

.table-wrapper {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  border-collapse: collapse;
  background-color: var(--color-bg);
}

.history-table thead {
  background-color: var(--color-primary);
  color: white;
}

.history-table th,
.history-table td {
  padding: var(--space-md);
  text-align: left;
  border: 1px solid var(--color-border);
}

.history-table th {
  font-weight: 600;
  text-transform: uppercase;
  font-size: var(--font-size-sm);
  letter-spacing: 0.05em;
}

.history-table tbody tr:nth-child(even) {
  background-color: var(--color-bg-alt);
}

.history-table tbody tr:hover {
  background-color: var(--color-border);
}

.history-table td:nth-child(2) {
  text-align: center;
}

@media (max-width: 640px) {
  .history-table th,
  .history-table td {
    padding: var(--space-sm);
    font-size: var(--font-size-sm);
  }
}
</style>
