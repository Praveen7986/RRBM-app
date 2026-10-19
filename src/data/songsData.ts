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
  isMainSong?: boolean;
  mainSongDay?: 'day1' | 'day2' | 'day3' | string;
}

export const SONGS_DATA: Record<'day1' | 'day2' | 'day3', SongItem[]> = {
  day1: [
    {
      id: 's1',
      day: 'day1',
      isMainSong: true,
      mainSongDay: 'day1',
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
      isMainSong: true,
      mainSongDay: 'day2',
      title: 'Nee Mahima',
      sub: 'RRBM Worship Team',
      category: 'Opening',
      time: '5:12',
      key: 'Key of D',
      tempo: '72 BPM',
      lyricsPreview: 'Nee mahima choodalani naa aasa Yesayya...',
      themeVerse: 'Psalm 63:2 — "I have seen you in the sanctuary and beheld your power and your glory."',
      lyrics: `[పల్లవి]
నీ మహిమ చూడాలని నా ఆశ యేసయ్యా
నీ సన్నిధిలో గడపాలని నా తపన దేవా
మహిమ ఘనత నీకే ప్రభావము నీకే
యుగయుగములు నీకే చెల్లును గాక!

[చరణం 1]
పరిశుద్ధ స్థలములో నిన్ను చూచితిని
నీ బలమును నీ ప్రభావమును కనుగొంటిని
జీవముకంటె నీ కృప ఉత్తమమైనది
నా పెదవులు నిన్ను స్తుతించుచున్నవి!

[చరణం 2]
నా ప్రాణము నీ కొరకు తృప్తి నొందుచున్నది
ఉల్లాసముగల పెదవులతో నిన్ను కీర్తింతును
రాత్రిజాములయందు నిన్ను ధ్యానింతును
నీ రెక్కల నీడలో హర్షించుచుందును!`,
      teluguLyrics: `నీ మహిమ చూడాలని నా ఆశ యేసయ్యా...`
    },
    {
      id: 's8',
      day: 'day2',
      title: 'Yesu Nee Naamam',
      sub: 'RRBM Worship Team',
      category: 'Worship',
      time: '4:28',
      key: 'Key of G',
      tempo: '68 BPM',
      lyricsPreview: 'Yesu nee naamam entho madhuram, sarva srushtiki aadharam...',
      themeVerse: 'Philippians 2:9 — "Therefore God exalted him to the highest place and gave him the name that is above every name."',
      lyrics: `[పల్లవి]
యేసు నీ నామము ఎంతో మధురము
సర్వ సృష్టికి నీవే ఆధారము
యేసు రాజా నీకే స్తోత్రము
మా రక్షకా నీకే ఆరాధన!

[చరణం 1]
రోగములను బాగుచేయు నామము
బంధకములను తెంచు నామము
సమాధానమును ఇచ్చు నామము
రక్షణను అనుగ్రహించు నామము!

[చరణం 2]
ఏ నామమున రక్షణ లేదు
ఆకాశము క్రింద భూమిపై
యేసుక్రీస్తు నామమునందే
పాప క్షమాపణ దొరకును!`,
      teluguLyrics: `యేసు నీ నామము ఎంతో మధురము...`
    },
    {
      id: 's9',
      day: 'day2',
      title: 'Holy Spirit, Breathe On Us',
      sub: 'Bethel Translation Team',
      category: 'Intercession',
      time: '6:04',
      key: 'Key of A',
      tempo: '64 BPM',
      lyricsPreview: 'Holy Spirit breathe on us, fill this sanctuary with Your presence...',
      themeVerse: 'Ezekiel 37:9 — "Breathe into these slain, that they may live."',
      lyrics: `[Verse 1]
Holy Spirit breathe on us
Fill this room with heavenly wind
Revive the dry bones in our midst
Let revival fire fall again

[Chorus]
Holy Spirit, You are welcome here
Come flood this place and fill the atmosphere
Your glory, God, is what our hearts long for
To be overcome by Your presence, Lord

[Verse 2]
There's nothing worth more that will ever come close
No thing can compare, You're our living hope
Your presence, Lord

[Bridge]
Let us become more aware of Your presence
Let us experience the glory of Your goodness!`,
      teluguLyrics: `పరిశుద్ధాత్ముడా మాపై ఊదుము, ఈ స్థలమును నీ సన్నిధితో నింపుము!`
    },
    {
      id: 's10',
      day: 'day2',
      title: 'Naa Hrudayamlo',
      sub: 'RRBM Youth Choir',
      category: 'Worship',
      time: '4:21',
      key: 'Key of C',
      tempo: '70 BPM',
      lyricsPreview: 'Naa hrudayamlo neevundaga, naaku bhayamemi ledhayya...',
      themeVerse: 'Psalm 73:26 — "My flesh and my heart may fail, but God is the strength of my heart and my portion forever."',
      lyrics: `[పల్లవి]
నా హృదయములో నీవుండగా
నాకు భయమేమి లేదయ్యా
నా జీవితములో నీవుండగా
నాకు కొరత ఏది లేదయ్యా!

[చరణం 1]
కన్నీటి లోయలలో నడిచినను
నీ కృప నన్ను ఆదరించెను
శ్రమల కొలిమిలో వేగినను
నీ హస్తము నన్ను కాపాడెను!

[చరణం 2]
నీవే నా బలము నా రక్షణ
నీవే నా దుర్గము నా శరణు
ఎల్లప్పుడూ నిన్నే స్తుతింతును
నా ప్రాణమున్నంత వరకునూ!`,
      teluguLyrics: `నా హృదయములో నీవుండగా, నాకు భయమేమి లేదయ్యా...`
    },
    {
      id: 's11',
      day: 'day2',
      title: 'Krupalone Chalu',
      sub: 'RRBM Worship Team',
      category: 'Offering',
      time: '5:47',
      key: 'Key of E',
      tempo: '66 BPM',
      lyricsPreview: 'Nee krupa naaku chaalunu Yesayya, jeevithaanthamu varaku...',
      themeVerse: '2 Corinthians 12:9 — "My grace is sufficient for you, for my power is made perfect in weakness."',
      lyrics: `[పల్లవి]
కృపలోనే చాలు నీ కృపలోనే చాలు
జీవితాంతము వరకు నీ కృపయే చాలు
శ్రమలైన ఇరుకులైన నీ కృపయే చాలు
నా ప్రాణ ప్రియుడా నీ కృపయే చాలు!

[చరణం 1]
బలహీన సమయమున బలపరచు కృప
రోగ శోధనలలో స్వస్థపరచు కృప
నశించు ఆత్మలను రక్షించు కృప
నిత్య రాజ్యములో చేర్చు కృప!

[చరణం 2]
అర్హత లేని నాపై కుమ్మరించిన కృప
ప్రేమతో నన్ను హత్తుకున్న కృప
నీ సిలువ రక్తముతో కడిగిన కృప
సదాకాలము నాతో ఉండు కృప!`,
      teluguLyrics: `కృపలోనే చాలు నీ కృపలోనే చాలు...`
    },
    {
      id: 's12',
      day: 'day2',
      title: 'Aradhana Yesunaku',
      sub: 'RRBM Youth Choir',
      category: 'Closing',
      time: '3:56',
      key: 'Key of F',
      tempo: '110 BPM',
      lyricsPreview: 'Aradhana Yesunaku, hallelujah sthothramulatho...',
      themeVerse: 'Revelation 5:12 — "Worthy is the Lamb, who was slain, to receive power and wealth and wisdom and strength and honor and glory and praise!"',
      lyrics: `[పల్లవి]
ఆరాధన యేసునకే - హల్లెలూయా స్తుతులతో
ఆరాధన రక్షకునకే - నిత్య సంతోషముతో
జయము జయము యేసునకే
మహిమ ఘనత దేవునకే!

[చరణం 1]
మరణమును గెలిచి లేచిన రారాజు
సాతాను శక్తులను ఓడించిన దేవుడు
ఆకాశ మహాకాశములకు పైగా
హెచ్చింపబడిన నా యేసయ్య!

[చరణం 2]
రండి ఉత్సాహముగా పాడుదము
మన రక్షణ దుర్గమును కీర్తింతుము
కృతజ్ఞతా స్తుతులతో సన్నిధికి రండి
హల్లెలూయా గీతములను ఆలపింపుడి!`,
      teluguLyrics: `ఆరాధన యేసునకే - హల్లెలూయా స్తుతులతో...`
    }
  ],
  day3: [
    {
      id: 's13',
      day: 'day3',
      isMainSong: true,
      mainSongDay: 'day3',
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
