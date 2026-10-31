/** Every word Peter says, plus the escalating button labels. Original lines. */

export const LINES = {
  intro: "Heh heh. Hey, Albert! I got you a birthday present. It's the *big* one. Go on, open it!",
  block: "Whoa whoa whoa, hold on! You can't just *open* it. There's a whole process.",
  dance: 'Wait! First, the official Griffin birthday dance. It is *tradition*.',
  danceGo: '*Hit it!*',
  push: "Eh, actually it's blocking the TV. Lemme just…",
  scooch: '*SCOOOOCH.*',
  kneeStart: "Hang on, I'll go get i—",
  knee: 'Ssssss-AHHH! Ssssss-AHHH! *My knee!*',
  kneeAfter: '…Did that box just walk back by itself?',
  laugh: "Heh. Heheheh. Sorry, I just pictured your face when you open it. *HEHEHEHEH.*",
  fakeoutA: 'Okay, okay. Fine. Go ahead, buddy…',
  fakeoutB: '*NOPE!* Heh. Just kidding. Well, not kidding. Still nope.',
  giveIn: "Alright, alright. It's all yours, buddy. Happy birthday.",
  reveal: 'Drumroll, please…',
  finale: "Best present ever, right? You're welcome.",
} as const

/** Button label shown after each interruption (index = how many times you've tried). */
export const LABELS = [
  'OPEN THE PRESENT',
  'TRY AGAIN',
  'SERIOUSLY, OPEN IT',
  'GO GET IT',
  "OPEN IT, HE'S DOWN!",
  'OPEN. THE. PRESENT.',
  'FINALLY! OPEN IT',
  "I'M BEGGING YOU",
] as const

export const OPEN_FOR_REAL = 'OPEN IT. FOR REAL.'

/** Little scribbled aside above the button, per attempt. */
export const NOTES = [
  'he got you something. probably.',
  'attempt #2. stay strong.',
  'attempt #3. the box looks impatient.',
  'attempt #4. where did it go??',
  'attempt #5. medical emergency (minor).',
  "attempt #6. he thinks he's hilarious.",
  'attempt #7. is this… it?',
  'attempt #8. he will never let you.',
  'this is not a drill.',
] as const
