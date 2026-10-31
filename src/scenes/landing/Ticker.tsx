import { memo } from 'react'

const NEWS = [
  'LOCAL MAN TURNS ONE YEAR OLDER, SCIENTISTS BAFFLED',
  "WHITE MONSTER STOCK SURGES AHEAD OF ALBERT'S BIRTHDAY",
  'TRU FRU REPORTS NATIONWIDE FROZEN BLUEBERRY SHORTAGE',
  'GORILLA MIND CONFIRMS ALBERT IS "BUILT DIFFERENT"',
  'NEIGHBORS REPORT 2 AM GUITAR SOLO: "HONESTLY? IT SLAPPED"',
  'CARTMAN DEMANDS CAKE, REFUSES TO APOLOGIZE',
  'TUNG TUNG TUNG SAHUR SPOTTED NEAR PARTY — STAY AWAKE',
  'PETER GRIFFIN STILL WRAPPING PRESENT, SOURCES SAY',
  'AURA LEVELS REACH ALL-TIME HIGH',
  'EXPERTS AGREE: THIS IS ALBERT’S YEAR',
]

function Items() {
  return (
    <>
      {NEWS.map((n) => (
        <span className="ticker__item" key={n}>
          <span className="ticker__star">✦</span>
          {n}
        </span>
      ))}
    </>
  )
}

/** Scrolling meme-news crawl along the top edge. */
export const Ticker = memo(function Ticker() {
  return (
    <div className="ticker is-ambient" role="marquee" aria-label="Breaking brainrot news">
      <span className="ticker__tag">
        <span className="ticker__dot" />
        BREAKING
      </span>
      <div className="ticker__viewport">
        <div className="ticker__track">
          <Items />
          <Items />
        </div>
      </div>
    </div>
  )
})
