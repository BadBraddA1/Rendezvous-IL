<template>
  <div id="app">
    <header class="site-header">
      <div class="container">
        <h1 class="site-title">
          <router-link to="/">Rendezvous</router-link>
        </h1>
        <nav class="main-nav" aria-label="Main navigation">
          <router-link to="/" class="nav-link">Home</router-link>
          <router-link to="/schedule" class="nav-link">Schedule</router-link>
          <router-link to="/about" class="nav-link">About</router-link>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <router-view />
    </main>

    <footer class="site-footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-section">
            <h3>Contact</h3>
            <p>
              Stephen & Ranae Bradd<br />
              824 W. Main St.<br />
              Clinton, IL 61727<br />
              <a href="tel:2179355058">(217)935-5058</a><br />
              <a href="mailto:Stephen@Bradd.us">Stephen@Bradd.us</a>
            </p>
          </div>
          <div class="footer-section">
            <h3>Connect</h3>
            <p>
              <a
                href="https://www.RendezvousIL.com"
                target="_blank"
                rel="noopener"
                >www.RendezvousIL.com</a
              ><br />
              <a
                href="https://www.facebook.com/groups/RendezvousIL"
                target="_blank"
                rel="noopener"
                >Facebook Group</a
              >
            </p>
          </div>
        </div>
        <p class="copyright">
          &copy; {{ currentYear }} Rendezvous Illinois. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'App',
  computed: {
    currentYear() {
      return new Date().getFullYear()
    }
  }
}
</script>
