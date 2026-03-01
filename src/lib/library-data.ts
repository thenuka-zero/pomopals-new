export interface Book {
  slug: string;
  title: string;
  author: string;
  category: string;
  description: string;
  content: string;
  coverColor: string;
  coverAccent: string;
  coverTextColor: string;
  coverPattern: string;
  categoryColor: string;
}

export const BOOKS: Book[] = [
  {
    slug: "art-of-the-pomodoro",
    title: "The Art of the Pomodoro",
    author: "Pom",
    category: "Productivity",
    description: "A guide to mastering the Pomodoro technique, one tomato at a time.",
    content:
      "The Pomodoro Technique was born in the late 1980s when a university student named Francesco Cirillo picked up a tomato-shaped kitchen timer and made a simple promise to himself: stay focused for just 25 minutes. What seemed like a small act of discipline quietly became one of the most beloved productivity methods in the world. Its genius lies not in complexity but in the gentle rhythm it creates — a steady heartbeat of work and rest that feels almost musical once you find your pace.\n\nBefore you press start on each session, take a moment to set a clear intention. What is the one thing you want to accomplish in the next 25 minutes? Write it down, whisper it to yourself, or simply hold it in your mind like a warm cup of tea. This tiny ritual transforms a countdown into a mission. You are no longer just watching time pass — you are directing it, shaping it into something meaningful.\n\nThe breaks are not the enemy of productivity; they are the secret ingredient. When that timer rings, step away from your screen with the same decisiveness you brought to starting. Stretch, breathe, look out a window, or make yourself a warm drink. Your brain needs these moments to consolidate what you have learned and to recharge for the next sprint. Treat every break as a small gift you give to your future self, and you will return to your desk feeling refreshed rather than depleted.",
    coverColor: "#E54B4B",
    coverAccent: "#FDF6EC",
    coverTextColor: "#FDF6EC",
    coverPattern: "🍅",
    categoryColor: "#5C4033",
  },
  {
    slug: "focus-and-flow",
    title: "Focus & Flow",
    author: "Pom",
    category: "Mindfulness",
    description: "Finding your flow state during work sessions — and staying there.",
    content:
      "Flow is one of those rare human experiences that is easier to recognize than to define. You know you are in it when time loses its usual weight, when the gap between intention and action disappears, and when the work seems to move through you rather than from you. Psychologist Mihaly Csikszentmihalyi, who first mapped this territory, described flow as the optimal experience — a state where challenge and skill meet in perfect balance. The good news is that flow is not a random gift; it is a state you can actively cultivate.\n\nThe Pomodoro timer is a surprisingly elegant container for flow. By committing to a fixed 25-minute window, you lower the psychological cost of starting, which is often the highest barrier to deep focus. The ticking clock creates a gentle urgency that keeps the mind from wandering too far, while the clear endpoint prevents the exhaustion that comes from open-ended effort. Many practitioners report that flow tends to arrive somewhere in the middle of the second or third pomodoro of a session — once the initial restlessness settles and the work's inner logic begins to reveal itself.\n\nMindful transitions between sessions are what preserve that hard-won energy. Rather than snapping immediately to your phone or email during a break, try a brief pause: close your eyes, take three slow breaths, and let the momentum of what you just built settle gently into your body. When you return to work, you carry that calm focus with you rather than starting from scratch. Over time, these small rituals compound into a personal rhythm that makes flow not a happy accident but a reliable daily visitor.",
    coverColor: "#6EAE3E",
    coverAccent: "#FDF6EC",
    coverTextColor: "#FDF6EC",
    coverPattern: "🌿",
    categoryColor: "#3D5C1A",
  },
  {
    slug: "break-room-chronicles",
    title: "The Break Room Chronicles",
    author: "Pom",
    category: "Wellness",
    description: "Why breaks matter more than you think — your brain will thank you.",
    content:
      "Science has a reassuring message for anyone who has ever felt guilty about stepping away from their desk: breaks are not laziness in disguise — they are how the brain does its most important work. During rest, the hippocampus quietly sorts through the information you have just encountered, filing away what matters and releasing what does not. Memory consolidation, creative insight, and problem-solving all peak not during intense effort but in the soft moments just after. The pause, it turns out, is part of the process.\n\nWalking away from a difficult problem is one of the most counterintuitive and effective strategies a focused person can have. When you step outside for five minutes or make a cup of tea, your unconscious mind keeps working on the challenge without the interference of conscious striving. The classic shower-thought breakthrough is not mythology — it is neuroscience. You return to your desk not just rested but often with a fresh angle that hours of forcing the issue could not produce. Productivity, in this light, is not about relentless output; it is about knowing when to push and when to let go.\n\nNot all breaks are created equal, though. Five minutes scrolling social media leaves the brain more stimulated and less restored than five minutes spent in quiet movement. Try a short walk to a different room, a stretch sequence, some slow breathing, or even a few minutes of doodling. Keep a small list of your favorite five-minute restorers somewhere visible — a little menu of renewal. The more intentional your breaks, the more energized your work sessions will feel, and the more sustainable your focus becomes over the long arc of the day.",
    coverColor: "#5C4033",
    coverAccent: "#F5A0A0",
    coverTextColor: "#F0E6D3",
    coverPattern: "☕",
    categoryColor: "#E54B4B",
  },
  {
    slug: "tomato-timer-tales",
    title: "Tomato Timer Tales",
    author: "Pom",
    category: "Stories",
    description: "Fun, heartwarming stories from the PomoPals community.",
    content:
      "Welcome to Tomato Timer Tales — a little anthology born from the belief that behind every ticking timer is a human story worth telling. The PomoPals community is a wonderfully varied gathering: students pulling all-nighters before finals, novelists chasing word counts, freelancers juggling three projects at once, and retirees rediscovering old passions. What unites them all is the humble 25-minute promise, and the quiet companionship of knowing that somewhere in the world, someone else's timer is ticking alongside theirs.\n\nThere is a particular story that comes to mind whenever we think about what PomoPals can mean. A first-year university student named Maya discovered the app during a particularly overwhelming exam season. She had tried every productivity hack in the book, but nothing stuck — until she stumbled into a public study room one Tuesday evening and saw the names of a dozen strangers, each with a glowing green timer. She started her first pomodoro feeling sheepish and skeptical. By the end of the second, something had shifted. The shared rhythm, the silent solidarity of all those timers counting down together, made the mountain of studying feel less like a solitary ordeal and more like a group expedition. She passed her exams. More importantly, she kept coming back.\n\nNow it is your turn. Perhaps you are reading this during a break between your own pomodoros, or perhaps you are just getting started. Either way, your story is already beginning — a timer set, an intention held, a small act of courage against distraction. The shelves of Pom's Library are full of tales like yours, waiting to be written. We cannot wait to hear them.",
    coverColor: "#F0E6D3",
    coverAccent: "#E54B4B",
    coverTextColor: "#3D2C2C",
    coverPattern: "📖",
    categoryColor: "#E54B4B",
  },
  {
    slug: "deep-work-for-beginners",
    title: "Deep Work for Beginners",
    author: "Pom",
    category: "Productivity",
    description: "Getting started with deep focused work — no PhD required.",
    content:
      "Deep work, as author Cal Newport defines it, is the ability to focus without distraction on a cognitively demanding task. In simpler terms, it is the kind of work where you are fully present — not half-reading an email while half-listening to a podcast. It sounds straightforward, but in a world engineered for constant interruption, genuine deep work has become both rarer and more valuable. The encouraging news is that it is a skill, not a talent, which means anyone can build it with practice.\n\nEven 25 uninterrupted minutes of focused work beats two hours of scattered, fragmented effort. When your attention is divided, your brain pays a switching cost each time it jumps between tasks — and those costs add up to a staggering amount of wasted mental energy. A single pomodoro of true concentration, where you close every unnecessary tab and put your phone face-down, can produce more meaningful progress than a full afternoon of distracted busyness. This is not an exaggeration; it is something you can test for yourself today.\n\nIf you are new to deep work, here are three tips to make your first session a success. First, choose one specific task before you start the timer — not a vague category like \"study\" but a concrete action like \"write the introduction to chapter two.\" Second, eliminate escape routes: close notifications, use a browser blocker if you need one, and let the people around you know you are in focus mode. Third, be gentle with yourself when your mind wanders — and it will wander. Simply notice it with a quiet smile and return to the task. Each return is a small mental pushup, and over time those pushups build remarkable strength.",
    coverColor: "#3D2C2C",
    coverAccent: "#F5A0A0",
    coverTextColor: "#FDF6EC",
    coverPattern: "🧠",
    categoryColor: "#F5A0A0",
  },
  {
    slug: "procrastination-cure",
    title: "The Procrastination Cure",
    author: "Pom",
    category: "Self-Help",
    description: "Beating procrastination one pomodoro at a time — starting now.",
    content:
      "Let us begin with a gentle truth: everyone procrastinates. The novelist who has published twelve books procrastinates. The productivity guru who wrote the definitive guide to getting things done has days when they cannot bring themselves to open their laptop. Procrastination is not a character flaw or a sign of laziness — it is an emotional response to tasks that feel overwhelming, boring, threatening, or simply too large to hold in the mind all at once. Understanding this changes everything, because the solution is not more willpower. It is less friction.\n\nThis is where the humble 25-minute pomodoro performs something close to magic. When a task feels enormous, the brain resists starting it because it cannot see the end. But almost anyone can commit to just 25 minutes — not to finishing the project, not to getting it right, just to showing up for a single session. That small commitment dramatically lowers what psychologists call activation energy: the mental effort required to begin. You are not promising to climb the mountain; you are only promising to lace up your shoes and step outside. And almost always, once you start moving, you want to keep going.\n\nThe momentum that follows a completed pomodoro is real and wonderfully addictive. There is a particular satisfaction in watching that first tomato fill in on your tracker — a tangible proof that you did the thing you were avoiding. That small victory changes your emotional relationship with the task. It is no longer the monster looming in your peripheral vision; it is something you have already done, at least partly. The second pomodoro becomes easier than the first, and the third easier still. Before long, the procrastination that felt immovable has quietly dissolved into a streak of focused sessions, and the work is nearly done.",
    coverColor: "#A08060",
    coverAccent: "#FDF6EC",
    coverTextColor: "#FDF6EC",
    coverPattern: "⏰",
    categoryColor: "#5C4033",
  },
  {
    slug: "study-buddies",
    title: "Study Buddies",
    author: "Pom",
    category: "Social",
    description: "How studying with friends boosts productivity — and makes it way more fun.",
    content:
      "Accountability is one of the most powerful forces in human behavior, and it works best when it is warm rather than punishing. When you tell a friend you will meet them in the study room at 7pm, you are far more likely to show up than if you made the same promise only to yourself. Research consistently shows that sharing goals with another person — even a stranger — increases follow-through dramatically. The reason is simple: we care about how we appear to others, and we do not want to let them down. Harnessing that social instinct in service of your focus is not cheating; it is just being cleverly human.\n\nBody doubling is a technique that has gained significant attention in recent years, particularly among people who struggle with attention and motivation. The idea is elegantly simple: the mere presence of another person who is also working helps you stay on task. You do not need to talk, collaborate, or even make eye contact. Something about having a witness — even a silent, studious one — keeps the wandering mind tethered to the work. Libraries have known this for centuries. Co-working spaces have built entire business models around it. PomoPals brings it to wherever you happen to be.\n\nPomoPals rooms transform remote study sessions into something that genuinely feels like sitting side by side in a cozy library. You can see your friends' timers ticking in sync with yours, know that they are in the same focused session, and feel the quiet encouragement of shared rhythm. When one person finishes a pomodoro, everyone celebrates together. When the break arrives, you can drop a quick message, share a funny observation, or just sit in comfortable digital silence. It is social focus without the distraction of socializing — and it makes the whole endeavor of sustained work feel considerably less lonely.",
    coverColor: "#F5A0A0",
    coverAccent: "#3D2C2C",
    coverTextColor: "#3D2C2C",
    coverPattern: "👥",
    categoryColor: "#5C4033",
  },
  {
    slug: "night-owls-guide",
    title: "Night Owl's Guide to Morning Focus",
    author: "Pom",
    category: "Lifestyle",
    description:
      "Tips for night owls who need to be productive in the AM — without becoming a morning person.",
    content:
      "First, a validation: if you do your best thinking after 10pm, you are not broken. Night owls are simply people whose circadian rhythms peak later in the day, and there is solid science behind that preference. The world has been somewhat rudely organized around early risers, but that does not mean you need to overhaul your entire biology to be productive in the morning. What it does mean is that your morning approach might need to be gentler, more forgiving, and deliberately low-pressure — a soft on-ramp rather than a cold plunge.\n\nOne of the kindest things you can do for your morning self is build a gentle alarm pomodoro into your routine. When your alarm goes off, instead of reaching immediately for your phone, set a single 25-minute timer with the loosest possible intention: make coffee, sit with it, look out the window. No tasks, no emails, no decision-making. Just you and 25 minutes of slow waking. Many night owls find that this one transitional pomodoro — purposefully unhurried — makes the shift into the day feel bearable and even pleasant. You are not asking your nocturnal brain to sprint; you are asking it to walk.",
    coverColor: "#2C2C3D",
    coverAccent: "#F5A0A0",
    coverTextColor: "#F0E6D3",
    coverPattern: "🦉",
    categoryColor: "#F5A0A0",
  },
  {
    slug: "25-minute-revolution",
    title: "The 25-Minute Revolution",
    author: "Pom",
    category: "History",
    description:
      "The fascinating origin story of the Pomodoro Technique — it started with a kitchen timer.",
    content:
      "In the late 1980s, a young university student in Rome named Francesco Cirillo was struggling with a problem that will feel immediately familiar: he could not make himself study. Distraction was winning. Overwhelm was winning. He looked around his kitchen for something — anything — that might help him impose some structure on the chaos, and his hand landed on a small timer shaped like a tomato. Pomodoro, in Italian. He wound it to ten minutes, sat down, and tried. It was an awkward, unpromising start, but something about the ticking changed the texture of his attention. He kept experimenting, lengthening the intervals, and eventually arrived at 25 minutes as the sweet spot — long enough to accomplish something meaningful, short enough to feel manageable.\n\nCircillo named his method after that kitchen timer, and for years it lived in handwritten notebooks and shared in small workshops. The technique spread word of mouth, from student to student and office to office, before the internet gave it the global stage it deserved. By the time Cirillo published his book on the technique in 2006, hundreds of thousands of people around the world were already timing their work in 25-minute intervals, often without knowing there was a name for what they were doing. The tomato-shaped timer had become a worldwide phenomenon without a single marketing campaign.\n\nToday, the Pomodoro Technique is practiced by millions of people in every profession imaginable — surgeons, software engineers, novelists, school children, retirees. Apps, browser extensions, and entire productivity ecosystems have been built around its simple architecture. What began as one frustrated student's experiment with a kitchen timer has quietly reshaped how a significant portion of humanity thinks about time, focus, and the humble power of starting. Francesco Cirillo's tomato changed the world, 25 minutes at a time.",
    coverColor: "#8B7355",
    coverAccent: "#FDF6EC",
    coverTextColor: "#FDF6EC",
    coverPattern: "🕰️",
    categoryColor: "#F0E6D3",
  },
  {
    slug: "mindful-minutes",
    title: "Mindful Minutes",
    author: "Pom",
    category: "Mindfulness",
    description:
      "Incorporating mindfulness into your work sessions for a calmer, clearer mind.",
    content:
      "Before you press start on your next pomodoro, try this: close your eyes and take three slow, deliberate breaths. Inhale for four counts, hold gently for two, exhale for six. As you breathe out for the final time, set your intention for the session — not just the task, but the quality of attention you want to bring. Are you aiming for careful, methodical thinking? Creative exploration? Patient problem-solving? Naming the quality of your focus, not just the content of your work, is a small but surprisingly powerful act of mindfulness that anchors you before the timer even begins.\n\nDuring the session itself, treat your attention like a friendly puppy — it will wander, and that is not a failure. The practice is in the noticing and the returning. When you catch yourself drifting to worries about tomorrow or replaying a conversation from this morning, try mentally labeling the distraction with a quiet, nonjudgmental word: \"planning,\" \"remembering,\" \"worrying.\" Then return to your task. This gentle labeling, borrowed from formal meditation practice, creates a small but meaningful gap between the distraction and your reaction to it. Over time, that gap widens, and your focus becomes steadier — not because you have eliminated mind-wandering, but because you have gotten more skillful at working with it.\n\nWhen the timer rings, resist the pull to immediately launch into the next thing. Instead, take one full breath before you move. Notice how you feel — is there a sense of accomplishment, of restlessness, of tired satisfaction? Let yourself register that you just completed something. This closing pause, tiny as it is, transforms each pomodoro from a unit of output into a complete experience. You worked, you noticed, you finished. The next session begins from a place of wholeness rather than momentum-fueled rushing, and the quality of your attention — session after session — quietly deepens.",
    coverColor: "#7A9E6A",
    coverAccent: "#FDF6EC",
    coverTextColor: "#FDF6EC",
    coverPattern: "🧘",
    categoryColor: "#3D5C1A",
  },
];
