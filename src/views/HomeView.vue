<template>
  <div class="home-view">
    <div class="container">
      <section class="hero">
        <h1>Rendezvous — Christian Homeschool Family Retreat</h1>
        <div class="hero-details">
          <p class="event-dates">May 5-9, 2025 (Monday - Friday)</p>
          <p class="event-location">
            <strong>Lake Williamson Christian Center</strong><br />
            Carlinville, IL
          </p>
        </div>
        <div class="cta-buttons">
          <a href="#" class="btn btn-primary">Register</a>
        </div>
      </section>

      <section class="intro">
        <div class="content-wrapper">
          <p>
            Our family has enjoyed Roundhouse for 20 years now and plans to
            continue attending indefinitely, Lord willing. We appreciate the
            fellowship so much and look forward to it annually, despite the
            lengthy drive. We became aware of an alternative gathering for
            members of the Lord's church who home educate (e.g., Roundup). We
            contemplated attending it but decided instead to launch an
            alternative here in Illinois near St. Louis.
          </p>
          <p>
            Our goal is to provide a 5 day / 4 night retreat filled with
            fellowship, worship, recreation, and encouragement for Christian
            families who educate their children at home.
          </p>
          <div class="cta-buttons">
            <router-link to="/schedule" class="btn btn-primary"
              >View Schedule</router-link
            >
            <router-link to="/about" class="btn btn-secondary"
              >Learn More</router-link
            >
          </div>
        </div>
      </section>

      <section class="quick-facts">
        <h2>Quick Facts</h2>
        <div class="facts-grid">
          <FactCard title="Meals Provided">
            All meals are buffet style in the dining hall. LWCC does all the
            cooking and cleanup!
          </FactCard>
          <FactCard title="Lodging Options">
            Choose from motel rooms (sleep up to 6), RV camping, or tent
            camping.
          </FactCard>
          <FactCard title="Activities">
            Archery, mini golf, black-light dodgeball, nine square, basketball,
            volleyball, obstacle course, indoor pool, disc golf, canoeing, and
            more!
          </FactCard>
          <FactCard title="Learn More">
            <p>
              Website:
              <a
                href="https://www.RendezvousIL.com"
                target="_blank"
                rel="noopener"
                >www.RendezvousIL.com</a
              >
            </p>
            <p>
              Facebook:
              <a
                href="https://www.facebook.com/groups/RendezvousIL"
                target="_blank"
                rel="noopener"
                >Join our group</a
              >
            </p>
            <p>
              LWCC:
              <a
                href="https://www.LakeWilliamson.org"
                target="_blank"
                rel="noopener"
                >www.LakeWilliamson.org</a
              >
            </p>
          </FactCard>
        </div>
      </section>

      <section class="callouts">
        <div class="content-wrapper">
          <h2>Important Information</h2>

          <div class="callout-item">
            <h3>Bible Bowl</h3>
            <p>
              Everyone is encouraged to participate in the Bible Bowl on
              Thursday morning. Download the study materials:
              <a
                href="https://www.RendezvousIL.com/2025BibleBowl.pdf"
                target="_blank"
                rel="noopener"
                >www.RendezvousIL.com/2025BibleBowl.pdf</a
              >
            </p>
          </div>

          <div class="callout-item">
            <h3>WiFi Access</h3>
            <p>
              Network: <strong>LWCC</strong><br />
              Password: <strong>wifi4lwcc</strong>
            </p>
          </div>

          <div class="callout-item">
            <h3>Add-on Activity: Climbing Tower</h3>
            <p>
              Friday 1:30 PM — Indoor Climbing Tower [$10 per person;
              pre-registration by April 15th required]
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import FactCard from '../components/FactCard.vue'

export default {
  name: 'HomeView',
  components: {
    FactCard
  }
}
</script>

<style scoped>
.hero {
  text-align: center;
  padding: var(--space-2xl) 0;
  background: linear-gradient(
    to bottom,
    var(--color-bg-alt),
    var(--color-bg)
  );
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-2xl);
}

.hero h1 {
  font-size: var(--font-size-3xl);
  color: var(--color-primary);
  margin-bottom: var(--space-lg);
}

.hero-details {
  margin: var(--space-xl) 0;
  font-size: var(--font-size-lg);
}

.event-dates {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-secondary);
  margin-bottom: var(--space-sm);
}

.event-location {
  color: var(--color-text-light);
}

.cta-buttons {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  flex-wrap: wrap;
  margin-top: var(--space-xl);
}

.intro {
  margin-bottom: var(--space-3xl);
}

.intro p {
  font-size: var(--font-size-lg);
  line-height: 1.8;
}

.quick-facts {
  margin-bottom: var(--space-3xl);
}

.quick-facts h2 {
  text-align: center;
  color: var(--color-primary);
  margin-bottom: var(--space-xl);
}

.facts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-lg);
}

.callouts {
  margin-bottom: var(--space-2xl);
}

.callouts h2 {
  text-align: center;
  color: var(--color-primary);
  margin-bottom: var(--space-xl);
}

.callout-item {
  background-color: var(--color-bg-alt);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--color-accent);
  margin-bottom: var(--space-lg);
}

.callout-item h3 {
  color: var(--color-secondary);
  margin-bottom: var(--space-sm);
}

.callout-item p {
  margin-bottom: var(--space-sm);
}

.callout-item p:last-child {
  margin-bottom: 0;
}

@media (max-width: 640px) {
  .hero h1 {
    font-size: var(--font-size-2xl);
  }

  .facts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
