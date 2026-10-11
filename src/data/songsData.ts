// src/data/songsData.ts
// Official Worship Songs Schedule & Full Lyrics for RRBM 3-Day Fasting Prayers 2026
// Dates: October 20, 21, 22, 2026

export interface SongItem {
  id: string;
  day: 'day1' | 'day2' | 'day3';
  title: string;
  sub: string;
  category: string;
  time: string;
  key: string;
  tempo: string;
  lyricsPreview: string;
  lyrics: string;
  teluguLyrics?: string;
  themeVerse?: string;
}

export const SONGS_DATA: Record<'day1' | 'day2' | 'day3', SongItem[]> = {
  day1: [
    {
      id: 's1',
      day: 'day1',
      title: 'Amazing Grace (My Chains Are Gone)',
      sub: 'Opening Praise & Thanksgiving Session',
      category: 'Opening Praise',
      time: '09:15 AM',
      key: 'G Major',
      tempo: '68 BPM',
      lyricsPreview: 'Amazing grace how sweet the sound, that saved a wretch like me...',
      themeVerse: 'Ephesians 2:8 — "For it is by grace you have been saved through faith."',
      lyrics: `[Verse 1]
Amazing grace how sweet the sound
That saved a wretch like me
I once was lost, but now I'm found
Was blind, but now I see

[Verse 2]
'Twas grace that taught my heart to fear
And grace my fears relieved
How precious did that grace appear
The hour I first believed

[Chorus]
My chains are gone, I've been set free
My God, my Savior has ransomed me
And like a flood His mercy rains
Unending love, amazing grace

[Verse 3]
The Lord has promised good to me
His word my hope secures
He will my shield and portion be
As long as life endures

[Bridge]
The earth shall soon dissolve like snow
The sun forbear to shine
But God, who called me here below
Will be forever mine`,
      teluguLyrics: `[కీర్తన 1]
కృప ఎంత మధురమైనది నా యేసయ్యా
నశియించిన నన్ను రక్షించెను
నే తప్పిపోతిని దొరికితిని
గ్రుడ్డివాడనై యుండి చూపు నొందితిని

[పల్లవి]
నా బంధకాలన్నీ తెగిపోయెను
నా రక్షకుడగు యేసే నన్ను విడిపించెను
ప్రవాహముగా ఆయన కృప కురియుచున్నది
అనంతమైన ప్రేమ, అద్భుత కృప!`
    },
    {
      id: 's2',
      day: 'day1',
      title: 'Blessed Be Your Name',
      sub: 'Consecration & Youth Dedication',
      category: 'Consecration',
      time: '10:00 AM',
      key: 'B Major',
      tempo: '116 BPM',
      lyricsPreview: 'Blessed be Your name in the land that is plentiful...',
      themeVerse: 'Job 1:21 — "Blessed be the name of the Lord."',
      lyrics: `[Verse 1]
Blessed be Your name in the land that is plentiful
Where Your streams of abundance flow
Blessed be Your name

[Verse 2]
Blessed be Your name when I'm found in the desert place
Though I walk through the wilderness
Blessed be Your name

[Chorus]
Every blessing You pour out I'll turn back to praise
When the darkness closes in, Lord, still I will say
Blessed be the name of the Lord
Blessed be Your name
Blessed be the name of the Lord
Blessed be Your glorious name

[Bridge]
You give and take away
You give and take away
My heart will choose to say
Lord, blessed be Your name`,
      teluguLyrics: `[పల్లవి]
నీ నామము స్తుతించబడును గాక
సమృద్ధి గల దేశమందునైనా
ఎడారిలో నేను నడిచినను
నీ నామమే పూజార్హమైనది!`
    },
    {
      id: 's3',
      day: 'day1',
      title: 'Holy Spirit, You Are Welcome Here',
      sub: 'Altar Prayer & Anointing Overflow',
      category: 'Altar Call',
      time: '11:15 AM',
      key: 'D Major',
      tempo: '72 BPM',
      lyricsPreview: 'Holy Spirit You are welcome here, come flood this place and fill the atmosphere...',
      themeVerse: 'Acts 2:4 — "All of them were filled with the Holy Spirit."',
      lyrics: `[Verse 1]
There's nothing worth more that will ever come close
No thing can compare, You're our living hope
Your Presence, Lord

[Chorus]
Holy Spirit You are welcome here
Come flood this place and fill the atmosphere
Your glory, God, is what our hearts long for
To be overcome by Your Presence, Lord
Your Presence, Lord

[Bridge]
Let us become more aware of Your Presence
Let us experience the glory of Your goodness`,
      teluguLyrics: `[పల్లవి]
పరిశుద్ధాత్ముడా రమ్ము మా మధ్యకు
ఈ స్థలమంతయు నీ మహిమతో నింపుము
నీ సన్నిధియే మా ప్రాణాధారము
నీ సన్నిధిలో మేము జీవింతుము!`
    },
    {
      id: 's4',
      day: 'day1',
      title: 'Revival Fire Fall on Us',
      sub: 'RRBM 2026 Theme Anthem',
      category: 'Youth Revival',
      time: '02:30 PM',
      key: 'E Minor',
      tempo: '128 BPM',
      lyricsPreview: 'Revival fire fall upon our youth, ignite our hearts with holy truth...',
      themeVerse: 'Leviticus 6:13 — "The fire must be kept burning on the altar continuously."',
      lyrics: `[Verse 1]
As we fast, as we pray
Lord rebuild our lives today
From the ashes rise anew
All our strength is found in You

[Chorus]
Revival fire fall upon us now!
Rebuild our hearts, before Your throne we bow!
RRBM, a generation rise
With the holy power in our eyes!

[Bridge]
Send the fire! Send the rain!
Break every chain and erase the pain!
Jesus Christ, revive this land!`,
      teluguLyrics: `[పల్లవి]
ఉజ్జీవ అగ్నిని కుమ్మరించు దేవా
యువతరంపై నీ ఆత్మను రగిలించుము
పునర్నిర్మింపబడు సంఘముగా
ప్రజ్వలింతుము నీ సాక్షులుగా!`
    },
    {
      id: 's5',
      day: 'day1',
      title: 'What a Beautiful Name',
      sub: 'Evening Exaltation & Adoration',
      category: 'Worship',
      time: '04:45 PM',
      key: 'D Major',
      tempo: '68 BPM',
      lyricsPreview: 'You were the Word at the beginning, One with God the Lord Most High...',
      themeVerse: 'Philippians 2:9 — "God exalted Him to the highest place."',
      lyrics: `[Verse 1]
You were the Word at the beginning
One with God the Lord Most High
Your hidden glory in creation
Now revealed in You our Christ

[Chorus 1]
What a beautiful Name it is
What a beautiful Name it is
The Name of Jesus Christ my King
What a beautiful Name it is
Nothing compares to this
What a beautiful Name it is
The Name of Jesus

[Verse 2]
You didn't want heaven without us
So Jesus You brought heaven down
My sin was great, Your love was greater
What could separate us now

[Bridge]
Death could not hold You, the veil tore before You
You silence the boast of sin and grave
The heavens are roaring the praise of Your glory
For You are raised to life again!`,
      teluguLyrics: `[పల్లవి]
ఎంత శ్రేష్టమైన నామము ఇది
యేసు క్రీస్తు నా రాజు నామము
ఏ నామము సరిపోలదు
యేసయ్య నీ నామమునకే జయము!`
    },
    {
      id: 's6',
      day: 'day1',
      title: 'King of My Heart',
      sub: 'Night Consecration & Surrender',
      category: 'Consecration',
      time: '07:15 PM',
      key: 'A Major',
      tempo: '70 BPM',
      lyricsPreview: 'Let the King of my heart be the mountain where I run...',
      themeVerse: 'Psalm 73:26 — "God is the strength of my heart and my portion forever."',
      lyrics: `[Verse 1]
Let the King of my heart be the mountain where I run
The fountain I drink from, oh He is my song
Let the King of my heart be the shadow where I hide
The ransom for my life, oh He is my song

[Chorus]
You are good, good, oh
You are good, good, oh
You are good, good, oh
You are good, good, oh

[Bridge]
You're never gonna let, never gonna let me down
You're never gonna let, never gonna let me down`,
      teluguLyrics: `[పల్లవి]
నీవే నా హృదయపు రాజువయ్యా
నీవే నా శరణ్యము, నా గీతము
నీవు మంచివాడవు, దయామయుడవు
ఎన్నడూ నన్ను చేయి విడువవు!`
    }
  ],
  day2: [
    {
      id: 's7',
      day: 'day2',
      title: 'As the Deer Pants for Water',
      sub: 'Thirst for God & Fasting Altar',
      category: 'Morning Fasting',
      time: '09:30 AM',
      key: 'D Major',
      tempo: '72 BPM',
      lyricsPreview: 'As the deer panteth for the water, so my soul longeth after Thee...',
      themeVerse: 'Psalm 42:1 — "As the deer pants for streams of water, so my soul pants for you, my God."',
      lyrics: `[Verse 1]
As the deer panteth for the water
So my soul longeth after Thee
You alone are my heart's desire
And I long to worship Thee

[Chorus]
You alone are my strength, my shield
To You alone may my spirit yield
You alone are my heart's desire
And I long to worship Thee

[Verse 2]
You're my friend and You are my brother
Even though You are a King
I love You more than any other
So much more than anything`,
      teluguLyrics: `[పల్లవి]
దుప్పి నీటివాగుల కొరకు ఆశించునట్లు
దేవా నా ప్రాణము నీ కొరకు ఆశించుచున్నది
నీవే నా బలము, నా కేడెము
నిన్నే ఆరాధింతును నా యేసయ్యా!`
    },
    {
      id: 's8',
      day: 'day2',
      title: 'Jesus at the Center of It All',
      sub: 'Youth Devotion & Surrender',
      category: 'Devotion',
      time: '10:45 AM',
      key: 'A Major',
      tempo: '66 BPM',
      lyricsPreview: 'Jesus at the center of it all, from beginning to the end...',
      themeVerse: 'Colossians 1:18 — "So that in everything He might have the supremacy."',
      lyrics: `[Verse 1]
Jesus at the center of it all
Jesus at the center of it all
From beginning to the end
It will always be, it's always been You Jesus, Jesus

[Chorus]
Nothing else matters, nothing in this world will do
Jesus You're the center, everything revolves around You
Jesus You, at the center of it all

[Bridge]
From my heart to the heavens, Jesus be the center
It's all about You, yes it's all about You`,
      teluguLyrics: `[పల్లవి]
నా జీవిత కేంద్రము యేసయ్యవే
ఆదియు అంతము నీవే కదా
నా హృదయములో నీవే రారాజుగా
ఎల్లప్పుడు నిలువుము యేసయ్యా!`
    },
    {
      id: 's9',
      day: 'day2',
      title: 'Breathe on Me, Breath of God',
      sub: 'Holy Spirit Renewal Prayer',
      category: 'Spiritual Renewal',
      time: '03:00 PM',
      key: 'F Major',
      tempo: '64 BPM',
      lyricsPreview: 'Breathe on me, Breath of God, fill me with life anew...',
      themeVerse: 'Ezekiel 37:9 — "Breathe into these slain, that they may live."',
      lyrics: `[Verse 1]
Breathe on me, Breath of God
Fill me with life anew
That I may love what Thou dost love
And do what Thou wouldst do

[Verse 2]
Breathe on me, Breath of God
Until my heart is pure
Until with Thee I will one will
To do and to endure

[Chorus]
Come living Breath of God
Revive this dry and thirsty soul
Make us whole, make us whole`,
      teluguLyrics: `[పల్లవి]
జీవవాయువా మాపై ఊదుము
నూతన జీవముతో నింపుము
ఎండిన ఎముకలు జీవించునట్లు
నీ ఆత్మను మాపై కుమ్మరించుము!`
    },
    {
      id: 's10',
      day: 'day2',
      title: 'Hosanna in the Highest',
      sub: 'Exaltation & Joyful Worship',
      category: 'High Praise',
      time: '06:30 PM',
      key: 'G Major',
      tempo: '124 BPM',
      lyricsPreview: 'Hosanna, Hosanna, Hosanna in the highest...',
      themeVerse: 'Matthew 21:9 — "Hosanna in the highest heaven!"',
      lyrics: `[Verse 1]
Praise is rising, eyes are turning to You
We turn to You
Hope is stirring, hearts are yearning for You
We long for You

[Chorus]
Hosanna, Hosanna!
You are the God who saves us
Worthy of all our praises
Hosanna, Hosanna!
Come have Your way among us
We welcome You here, Lord Jesus`,
      teluguLyrics: `[పల్లవి]
హోసన్నా సర్వోన్నతమైన స్థలములలో
రక్షణ కర్తవైన దేవునికి హోసన్నా!
స్తుతులకు పాత్రుడవు నీవే యేసయ్యా!`
    },
    {
      id: 's11',
      day: 'day2',
      title: '10,000 Reasons (Bless the Lord)',
      sub: 'Evening Praise & Testimony',
      category: 'Praise',
      time: '08:00 PM',
      key: 'G Major',
      tempo: '73 BPM',
      lyricsPreview: 'Bless the Lord O my soul, O my soul, worship His holy name...',
      themeVerse: 'Psalm 103:1 — "Praise the Lord, my soul; all my inmost being, praise His holy name."',
      lyrics: `[Chorus]
Bless the Lord O my soul, O my soul
Worship His holy name
Sing like never before, O my soul
I'll worship Your holy name

[Verse 1]
The sun comes up, it's a new day dawning
It's time to sing Your song again
Whatever may pass, and whatever lies before me
Let me be singing when the evening comes

[Verse 2]
You're rich in love, and You're slow to anger
Your name is great, and Your heart is kind
For all Your goodness I will keep on singing
Ten thousand reasons for my heart to find`,
      teluguLyrics: `[పల్లవి]
నా ప్రాణమా యెహోవాను స్తుతించుము
ఆయన పరిశుద్ధ నామమును కీర్తించుము
ఎన్నడూ లేని రీతిగా గానము చేయుము
పదివేల కారణములు నా హృదయమునకు కలవు!`
    },
    {
      id: 's12',
      day: 'day2',
      title: 'Reckless Love',
      sub: 'Father’s Heart & Midnight Vigils',
      category: 'Worship',
      time: '09:30 PM',
      key: 'F# Minor',
      tempo: '68 BPM',
      lyricsPreview: 'Before I spoke a word, You were singing over me...',
      themeVerse: 'Luke 15:4 — "Leaves the ninety-nine in the open country and goes after the lost sheep."',
      lyrics: `[Verse 1]
Before I spoke a word, You were singing over me
You have been so, so good to me
Before I took a breath, You breathed Your life in me
You have been so, so kind to me

[Chorus]
Oh, the overwhelming, never-ending, reckless love of God
Oh, it chases me down, fights 'til I'm found, leaves the ninety-nine
I couldn't earn it, and I don't deserve it, still You give Yourself away
Oh, the overwhelming, never-ending, reckless love of God

[Bridge]
There's no shadow You won't light up
Mountain You won't climb up
Coming after me
There's no wall You won't kick down
Lie You won't tear down
Coming after me`,
      teluguLyrics: `[పల్లవి]
అంతులేని అనంతమైన దేవుని ప్రేమ
తొంభై తొమ్మిదిని విడిచి నన్ను వెదకివచ్చెను
నేను అర్హుడను కాను, సంపాదించలేను
అయిననూ నీ ప్రాణమును నాకై అర్పించితివి!`
    }
  ],
  day3: [
    {
      id: 's13',
      day: 'day3',
      title: 'Great Are You Lord',
      sub: 'All Creation Worship & Fast Conclusion',
      category: 'Fasting Altar',
      time: '09:30 AM',
      key: 'A Major',
      tempo: '72 BPM',
      lyricsPreview: 'It’s Your breath in our lungs, so we pour out our praise...',
      themeVerse: 'Psalm 145:3 — "Great is the Lord and most worthy of praise."',
      lyrics: `[Verse 1]
You give life, You are love
You bring light to the darkness
You give hope, You restore every heart that is broken
And great are You, Lord

[Chorus]
It's Your breath in our lungs
So we pour out our praise, we pour out our praise
It's Your breath in our lungs
So we pour out our praise to You only

[Bridge]
And all the earth will shout Your praise
Our hearts will cry, these bones will sing
Great are You, Lord!`,
      teluguLyrics: `[పల్లవి]
నీ శ్వాసయే మా ప్రాణమాయెను
కావున మా స్తుతులను కుమ్మరింతుము
గొప్పవాడవు దేవా, మహిమార్హుడవు!`
    },
    {
      id: 's14',
      day: 'day3',
      title: 'Way Maker, Miracle Worker',
      sub: 'Divine Healing & Breakthrough Hymn',
      category: 'Divine Healing',
      time: '11:00 AM',
      key: 'E Major',
      tempo: '68 BPM',
      lyricsPreview: 'Way Maker, Miracle Worker, Promise Keeper, Light in the darkness...',
      themeVerse: 'Isaiah 43:19 — "I am making a way in the wilderness and streams in the wasteland."',
      lyrics: `[Verse 1]
You are here, moving in our midst
I worship You, I worship You
You are here, working in this place
I worship You, I worship You

[Chorus]
You are Way Maker, Miracle Worker, Promise Keeper
Light in the darkness, my God, that is who You are!
Way Maker, Miracle Worker, Promise Keeper
Light in the darkness, my God, that is who You are!

[Bridge]
Even when I don't see it, You're working
Even when I don't feel it, You're working
You never stop, You never stop working!`,
      teluguLyrics: `[పల్లవి]
మార్గము చూపించువాడవు, అద్భుతములు చేయువాడవు
వాగ్దానములను నెరవేర్చువాడవు
చీకటిలో వెలుగువు, నా దేవుడవు నీవే!`
    },
    {
      id: 's15',
      day: 'day3',
      title: 'Goodness of God',
      sub: 'Thanksgiving & Final Blessing',
      category: 'Thanksgiving',
      time: '04:00 PM',
      key: 'Ab Major',
      tempo: '70 BPM',
      lyricsPreview: 'All my life You have been faithful, all my life You have been so so good...',
      themeVerse: 'Psalm 23:6 — "Surely your goodness and love will follow me all the days of my life."',
      lyrics: `[Verse 1]
I love You, Lord, for Your mercy never fails me
All my days, I've been held in Your hands
From the moment that I wake up until I lay my head
Oh, I will sing of the goodness of God

[Chorus]
'Cause all my life You have been faithful
And all my life You have been so, so good
With every breath that I am able
Oh, I will sing of the goodness of God

[Bridge]
Your goodness is running after, it's running after me
Your goodness is running after, it's running after me
With my life laid down, I'm surrendered now
I give You everything!`,
      teluguLyrics: `[పల్లవి]
నా జీవితమంతా నీవు నమ్మదగినవాడవు
నా ఆయుష్కాలమంతా నీవు ఎంతో మంచివాడవు
నా ప్రతి ఊపిరితో నీ మంచితనమును కీర్తింతును!`
    },
    {
      id: 's16',
      day: 'day3',
      title: 'Oceans (Where Feet May Fail)',
      sub: 'Youth Commissioning & Faith Step',
      category: 'Commissioning',
      time: '07:30 PM',
      key: 'D Major',
      tempo: '66 BPM',
      lyricsPreview: 'Spirit lead me where my trust is without borders, let me walk upon the waters...',
      themeVerse: 'Matthew 14:29 — "Peter got down out of the boat, walked on the water and came toward Jesus."',
      lyrics: `[Verse 1]
You call me out upon the waters
The great unknown where feet may fail
And there I find You in the mystery
In oceans deep my faith will stand

[Chorus]
And I will call upon Your name
And keep my eyes above the waves
When oceans rise, my soul will rest in Your embrace
For I am Yours and You are mine

[Bridge]
Spirit lead me where my trust is without borders
Let me walk upon the waters
Wherever You would call me
Take me deeper than my feet could ever wander
And my faith will be made stronger
In the presence of my Savior`,
      teluguLyrics: `[పల్లవి]
పరిశుద్ధాత్ముడా నన్ను నడిపించుము
సరిహద్దులు లేని విశ్వాసముతో
నీ పిలుపునకు లోబడి ముందుకు సాగెదను
నా రక్షకుని సన్నిధిలో బలపడెదను!`
    },
    {
      id: 's17',
      day: 'day3',
      title: 'Build My Life',
      sub: 'Consecration of the RRBM Youth',
      category: 'Consecration',
      time: '08:45 PM',
      key: 'G Major',
      tempo: '68 BPM',
      lyricsPreview: 'Worthy of every song we could ever sing, worthy of all the praise...',
      themeVerse: 'Matthew 7:24 — "Build his house on the rock."',
      lyrics: `[Verse 1]
Worthy of every song we could ever sing
Worthy of all the praise we could ever bring
Worthy of every breath we could ever breathe
We live for You

[Chorus]
Holy, there is no one like You, there is none beside You
Open up my eyes in wonder and show me who You are
And fill me with Your heart
And lead me in Your love to those around me

[Bridge]
I will build my life upon Your love, it is a firm foundation
I will put my trust in You alone, and I will not be shaken!`,
      teluguLyrics: `[పల్లవి]
నీ ప్రేమ బండపై నా జీవితమును కట్టుదును
నీవు నమ్మదగిన పునాదివి
నిన్నే నమ్మెదను, ఎన్నడూ కదల్చబడను!`
    },
    {
      id: 's18',
      day: 'day3',
      title: 'The Blessing (Kari Jobe & Cody Carnes)',
      sub: 'Final Benediction & 2026 Commissioning',
      category: 'Benediction',
      time: '10:00 PM',
      key: 'B Major',
      tempo: '70 BPM',
      lyricsPreview: 'The Lord bless you and keep you, make His face shine upon you...',
      themeVerse: 'Numbers 6:24-26 — "The Lord bless you and keep you."',
      lyrics: `[Verse]
The Lord bless you and keep you
Make His face shine upon you and be gracious to you
The Lord turn His face toward you
And give you peace

[Chorus]
Amen, Amen, Amen!
Amen, Amen, Amen!

[Bridge]
May His favor be upon you
And a thousand generations
And your family and your children
And their children, and their children
May His presence go before you
And behind you, and beside you
All around you, and within you
He is with you, He is with you!`,
      teluguLyrics: `[పల్లవి]
యెహోవా నిన్ను ఆశీర్వదించి కాపాడును గాక
ఆయన సన్నిధి నీకు తోడైయుండును గాక
ఆయన ముఖకాంతి నీపై ప్రకాశించును గాక
నీకు సమాధానము కలుగును గాక
ఆమేన్, ఆమేన్, ఆమేన్!`
    }
  ]
};
