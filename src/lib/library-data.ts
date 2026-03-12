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
    slug: "what-is-a-pomodoro",
    title: "What is a Pomodoro?",
    author: "Pom",
    category: "Productivity",
    description: "Everything you need to know about the Pomodoro Technique — what it is, where it came from, and why it works.",
    content:
      "A Pomodoro is a 25-minute focused work session followed by a short 5-minute break. The word \"pomodoro\" is Italian for tomato — named after the tomato-shaped kitchen timer that Francesco Cirillo used when he invented the technique as a university student in Rome in 1987. Each completed 25-minute interval is called one pomodoro. After four pomodoros, you take a longer break of 15 to 30 minutes before starting the next set. That's the entire system — deceptively simple, remarkably effective.\n\nThe Pomodoro Technique is a time management method designed to fight two of the biggest enemies of focused work: distraction and burnout. By breaking your day into short, defined intervals, the method removes the psychological burden of open-ended effort. Instead of sitting down to \"work on the report\" for an indeterminate stretch of time, you sit down for exactly 25 minutes. The finite duration makes it far easier to start — and starting is almost always the hardest part. Once the timer is running, the ticking creates a gentle urgency that keeps the mind engaged without exhausting it.\n\nWhy 25 minutes? Cirillo arrived at this interval through trial and error, and the research on attention spans supports his intuition. Human concentration tends to peak and then decline over roughly 20 to 30 minutes of continuous effort. Working in 25-minute bursts aligns with the brain's natural rhythm of focus, allowing you to stay sharp for the full session rather than grinding through diminishing returns. The mandatory break that follows isn't laziness — it's the biological reset that makes the next pomodoro possible. Neuroscience confirms that the hippocampus consolidates learning and problem-solving during rest, which means your breaks are doing real work even when you aren't.\n\nTo do a pomodoro, you need nothing but a timer and a task. Choose one thing to work on, set your timer for 25 minutes, and work on that single task without switching to anything else until the alarm sounds. No checking email, no answering messages, no \"quick\" detours. If a distracting thought pops into your head — and it will — write it down on a notepad so it doesn't disappear, and then return immediately to your task. When the timer rings, take your 5-minute break away from the screen: stretch, walk, make a drink, breathe. Then start the next pomodoro.\n\nOne pomodoro might not feel like much, but the cumulative effect is powerful. Each session builds momentum. Each completed interval gives you tangible evidence that you can focus, which makes the next one easier to start. People who use the Pomodoro Technique regularly report that they get more meaningful work done in four focused pomodoros than in a full eight-hour day of unfocused effort. The method strips away the illusion that busyness equals productivity and replaces it with something more honest: defined time, clear intention, real results.\n\nThe technique works across nearly every type of knowledge work. Students use it to study for exams without burning out. Writers use it to hit word counts without staring at a blank page. Programmers use it to maintain deep concentration during complex problem-solving. Designers, researchers, executives, and freelancers of every kind have adopted the Pomodoro Technique as the backbone of their daily workflow. Its simplicity is its strength — there is nothing to configure, nothing to optimize, nothing to learn beyond setting a timer and beginning.\n\nIf you want to go deeper, a few variations are worth knowing. Some practitioners use a 50-minute work interval with a 10-minute break, which suits tasks that need longer warm-up time. Others track their pomodoros throughout the day to build an honest record of how their time is actually spent — a practice that quickly reveals patterns and inefficiencies invisible to subjective memory. The most sophisticated practitioners pair each pomodoro with a written intention set before the timer starts: a one-sentence statement of exactly what they plan to accomplish. This intention transforms a countdown into a commitment and makes each 25-minute session a complete unit of purposeful work rather than a passage of time.\n\nSo: what is a Pomodoro? It is 25 minutes of your undivided attention, followed by 5 minutes of genuine rest, repeated with enough consistency to change the way you work. It is a tomato-shaped timer that became a global phenomenon. It is the simplest possible answer to the question of how to do more of what matters and less of everything else. Start one right now — the timer is ready when you are.",
    coverColor: "#E54B4B",
    coverAccent: "#FDF6EC",
    coverTextColor: "#FDF6EC",
    coverPattern: "🍅",
    categoryColor: "#5C4033",
  },
  {
    slug: "who-created-the-pomodoro-method",
    title: "Who Created the Pomodoro Method?",
    author: "Pom",
    category: "History",
    description: "The story of Francesco Cirillo — the university student who picked up a tomato-shaped kitchen timer and accidentally invented one of the most popular productivity methods in the world.",
    content: "Francesco Cirillo invented the Pomodoro Technique in the late 1980s as a university student in Rome. Struggling to focus, he challenged himself to just ten minutes of real work and grabbed a tomato-shaped kitchen timer to keep himself honest. The technique that grew out of that single experiment has since been adopted by millions of people around the world.",
    coverColor: "#8B5E3C",
    coverAccent: "#FDF6EC",
    coverTextColor: "#FDF6EC",
    coverPattern: "🕰️",
    categoryColor: "#5C4033",
  },
  {
    slug: "why-are-pomodoros-25-minutes",
    title: "Why are Pomodoros 25 minutes?",
    author: "Pom",
    category: "Productivity",
    description: "The science and story behind the iconic 25-minute interval — why not 20, not 30, but exactly 25?",
    content:
      "Twenty-five minutes is such a specific number that it is easy to assume there must be some elegant science behind it — a peer-reviewed study, a neuroscience paper, a precise measurement of the human attention span. The truth is both more human and more interesting than that. Francesco Cirillo arrived at 25 minutes through trial and error, the same way most good ideas are born: by trying something, noticing what happened, and adjusting. He experimented with intervals of 10 minutes, 15 minutes, and longer stretches, paying attention to how his focus felt during each one. Twenty-five minutes was where the sweet spot lived — long enough to accomplish something meaningful, short enough that the end was always visible from the start.\n\nThe human brain was not designed for open-ended effort. When a task has no visible finish line, a part of our nervous system quietly treats it as a threat — an indefinite drain on limited resources. This is one reason why \"I need to work on this all day\" produces so much more resistance than \"I will work on this for 25 minutes.\" The finite window changes the psychology entirely. Your brain can commit to anything when it knows exactly when it will be allowed to rest. The ticking clock is not a source of pressure; it is a promise. Twenty-five minutes of effort, and then you are free.\n\nResearch on sustained attention supports the intuition behind the Pomodoro interval. Studies on cognitive performance consistently show that concentration tends to peak somewhere between 20 and 45 minutes before beginning to degrade — at which point errors increase, processing slows, and the effort required to stay on task rises sharply. Working in 25-minute blocks keeps you operating near the front end of that curve, where your attention is sharpest and your output is most reliable. The mandatory break resets the clock, so the next interval begins fresh rather than at the tail end of an exhausted focus arc.\n\nThere is also something to be said for the rhythm that 25 minutes creates across a full day. Four pomodoros fill roughly two hours of work time, with the breaks factored in. That pace is sustainable across a full day in a way that longer unbroken stretches simply are not. Many practitioners find that their best days are built around six to eight pomodoros — a number that feels both ambitious and achievable, and that leaves enough energy at the end of the day to actually enjoy the evening. The 25-minute interval is not just a unit of focus; it is a unit of a sustainable life.\n\nIf you have ever tried a 25-minute session and found yourself wanting to keep going when the timer rang — good. That is exactly how it is supposed to feel. The slightly unsatisfied, still-engaged feeling at the end of a pomodoro is a sign that you have stopped before exhaustion set in, which means the next session will be just as strong as the last. The 25-minute mark is the place where you leave the party while you are still having fun. And just like that strategy works socially, it works cognitively: you will always want to come back.",
    coverColor: "#5B8CE5",
    coverAccent: "#FDF6EC",
    coverTextColor: "#FDF6EC",
    coverPattern: "⏱️",
    categoryColor: "#3D5C1A",
  },
  {
    slug: "best-books-on-pomodoros",
    title: "What are the best books on Pomodoros?",
    author: "Pom",
    category: "Productivity",
    description: "A reading list for anyone who wants to go deeper on focus, time management, and the Pomodoro philosophy.",
    content:
      "The Pomodoro Technique itself is described in a slim, readable book by its inventor, Francesco Cirillo, simply titled The Pomodoro Technique. Published in 2006 and updated in a popular 2018 edition, it is the definitive source on the method — not just the mechanics, but the philosophy behind them. Cirillo walks through the origins of the technique, the role of time as a tool rather than a tyrant, and the importance of observing your own work patterns over time. If you want to understand the Pomodoro Technique from the person who invented it, this is the natural place to start. It is a short read, unpretentious and practical, and it will change the way you see your working day.\n\nFor the science underneath the method, Deep Work by Cal Newport is essential reading. Newport makes the case that the ability to focus without distraction on a cognitively demanding task is both increasingly rare and increasingly valuable — and that it is a skill anyone can develop with the right habits. His arguments about the economics of attention and the architecture of a focused life give the Pomodoro Technique a broader intellectual home. After reading Deep Work, the 25-minute interval stops feeling like a productivity trick and starts feeling like a serious response to a serious problem in how modern work is organized.\n\nAtomic Habits by James Clear is not about the Pomodoro Technique specifically, but it is one of the most useful books for anyone trying to build a consistent pomodoro practice. Clear's insight — that habits are formed by making good behaviors easy and bad behaviors hard — applies directly to the challenge of sitting down for a focused session when your phone is nearby and your inbox is full. His framework of identity-based habits is particularly powerful: rather than trying to \"use the Pomodoro Technique,\" you become someone who works in focused intervals. That shift in framing makes consistency far more likely.\n\nFor those interested in the cognitive science behind focus and rest, Rest by Alex Soojung-Kim Pang is a quietly brilliant book. Pang examines how history's most productive people actually spent their time — and discovers that almost all of them worked far fewer hours than we might expect, compensated by an almost religious commitment to rest and recovery. The book validates what the Pomodoro Technique assumes: that breaks are not interruptions to work, but part of the work itself. Reading Rest will make you take your five-minute pauses far more seriously.\n\nFinally, Getting Things Done by David Allen — often called GTD — pairs beautifully with the Pomodoro Technique. Allen's system is about capturing every commitment and task into a trusted external system so that your mind is free to focus on what is in front of you right now. The Pomodoro Technique provides the execution layer that GTD sometimes lacks: once you know what to work on, the pomodoro tells you how. Together, the two systems cover the full cycle from planning to doing, and many practitioners use them in combination as the backbone of their entire productivity approach. If you read only two books from this list, make it Deep Work and Getting Things Done — and then try three pomodoros tomorrow morning before you open your inbox.",
    coverColor: "#6EAE3E",
    coverAccent: "#FDF6EC",
    coverTextColor: "#FDF6EC",
    coverPattern: "📚",
    categoryColor: "#3D5C1A",
  },
];
