/* eslint-disable no-new */

import { initAll } from 'govuk-frontend'

import Analytics from './components/analytics.mjs'
import BackToTop from './components/back-to-top.mjs'
import CookieBanner from './components/cookie-banner.mjs'
import { getConsentCookie, isValidConsentCookie } from './components/cookie-functions.mjs'
import CookiesPage from './components/cookies-page.mjs'
import Copy from './components/copy.mjs'
import Example from './components/example.mjs'
import Navigation from './components/navigation.mjs'
import OptionsTable from './components/options-table.mjs'
import Search from './components/search.mjs'
import AppTabs from './components/tabs.mjs'

// Initialise GOV.UK Frontend
initAll()

// Initialise cookie banner
const $cookieBanner = document.querySelector('[data-module="govuk-cookie-banner"]')
if ($cookieBanner) {
  new CookieBanner($cookieBanner)
}

// Initialise analytics if consent is given
const userConsent = getConsentCookie()
if (userConsent && isValidConsentCookie(userConsent) && userConsent.analytics) {
  Analytics()
}

// Register of examples by module
const exampleRegister = /** @type {Map<Element, Example>} */ (
  new Map()
)

// Defer init until viewport intersection
const exampleObserver = 'IntersectionObserver' in window
  ? new window.IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        return
      }

      console.log('init', { $module: entry.target })

      // Stop observing, initialise
      exampleObserver.unobserve(entry.target)
      exampleRegister.get(entry.target).init()
    }
  })
  : undefined

// Initialise examples
const $examples = document.querySelectorAll('[data-module="app-example"]')
$examples.forEach(($example) => {
  const example = new Example($example)

  // Initialise iframes immediately
  if (!exampleObserver) {
    return example.init()
  }

  // Add to register, start observing
  exampleRegister.set(example.$module, example)
  exampleObserver.observe(example.$module)
})

// Initialise tabs
const $tabs = document.querySelectorAll('[data-module="app-tabs"]')
$tabs.forEach(($tabs) => {
  new AppTabs($tabs)
})

// Do this after initialising tabs
new OptionsTable()

// Add copy to clipboard to code blocks inside tab containers
const $codeBlocks = document.querySelectorAll('[data-module="app-copy"] pre')
$codeBlocks.forEach(($codeBlock) => {
  new Copy($codeBlock)
})

// Initialise mobile navigation
new Navigation(document)

// Initialise search
const $searchContainer = document.querySelector('[data-module="app-search"]')
if ($searchContainer) {
  new Search($searchContainer)
}

// Initialise back to top
const $backToTop = document.querySelector('[data-module="app-back-to-top"]')
if ($backToTop) {
  new BackToTop($backToTop)
}

// Initialise cookie page
const $cookiesPage = document.querySelector('[data-module="app-cookies-page"]')
if ($cookiesPage) {
  new CookiesPage($cookiesPage)
}
