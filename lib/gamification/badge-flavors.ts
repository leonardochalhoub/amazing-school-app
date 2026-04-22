/**
 * Short, evocative hover flavors for every badge. Shown in the
 * browser tooltip when the user hovers a chip or a discovery card.
 * Kept separate from BADGE_DEFINITIONS so copy can be edited without
 * touching the machine-readable catalog.
 *
 * Rules for the prose:
 *  - short (one sentence, ideally < 12 words)
 *  - evocative, not a copy of the name/description
 *  - same spirit in both languages (not a literal translation)
 *  - no trailing period when it ruins the punch; otherwise keep
 */

export interface BadgeFlavor {
  en: string;
  pt: string;
}

export const BADGE_FLAVORS: Record<string, BadgeFlavor> = {
  // ═══ Core milestones ═══════════════════════════════════════════
  welcome_aboard:         { en: "First light on the frontier.", pt: "Primeira luz na fronteira." },
  first_lesson:           { en: "Signal acquired. Now the work begins.", pt: "Sinal captado. Agora o trabalho começa." },
  five_lessons:           { en: "Five stones in the ground.", pt: "Cinco pedras no chão." },
  ten_lessons:            { en: "Speed matches ambition.", pt: "A velocidade alcança a ambição." },
  bookworm:               { en: "Paper dust on your sleeves.", pt: "Poeira de papel nas mangas." },
  fifty_lessons:          { en: "Half a hundred, no shortcuts.", pt: "Meia centena, sem atalhos." },
  hundred_lessons:        { en: "The century mark bends for no one.", pt: "A marca de cem não dobra para ninguém." },
  two_fifty_lessons:      { en: "Deep orbit. No looking back.", pt: "Órbita profunda. Sem volta." },
  five_hundred_lessons:   { en: "Five hundred steps through the library.", pt: "Quinhentos passos pela biblioteca." },
  one_thousand_lessons:   { en: "A thousand lessons. A thousand nights.", pt: "Mil lições. Mil noites." },

  // ═══ Chat ════════════════════════════════════════════════════════
  first_chat:             { en: "First word with the machine.", pt: "Primeira palavra com a máquina." },
  ten_chats:              { en: "You keep the conversation alive.", pt: "Você mantém a conversa viva." },
  hundred_chats:          { en: "Voices of many — yours, loudest.", pt: "Vozes de muitos — a sua, a mais alta." },

  // ═══ Music ═══════════════════════════════════════════════════════
  first_song:             { en: "The room begins to sing.", pt: "A sala começa a cantar." },
  five_songs:             { en: "Playlist writes itself now.", pt: "A playlist se escreve sozinha agora." },
  music_lover:            { en: "English that rhymes on demand.", pt: "Inglês que rima sob demanda." },
  twenty_songs:           { en: "A mixtape worth its plastic.", pt: "Um mixtape que vale o plástico." },
  fifty_songs:            { en: "Side B starts here.", pt: "Lado B começa aqui." },
  hundred_songs:          { en: "Your own greatest-hits collection.", pt: "Sua própria coletânea de sucessos." },

  // ═══ Streaks ═════════════════════════════════════════════════════
  streak_3:               { en: "Kindling catches.", pt: "A brasa pega." },
  streak_7:               { en: "A week without flinching.", pt: "Uma semana sem piscar." },
  streak_14:              { en: "Discipline starts compounding.", pt: "A disciplina começa a render juros." },
  streak_30:              { en: "Thirty dawns, all yours.", pt: "Trinta amanheceres, todos seus." },
  streak_60:              { en: "The body remembers now.", pt: "O corpo já lembra sozinho." },
  streak_90:              { en: "Quarter-orbit around the sun.", pt: "Quarto de órbita ao redor do sol." },
  streak_180:             { en: "Six months of not-quitting.", pt: "Seis meses de não-desistir." },
  streak_365:             { en: "One full turn of the calendar.", pt: "Uma volta inteira do calendário." },

  // ═══ Levels ══════════════════════════════════════════════════════
  level_2:                { en: "Lift-off confirmed.", pt: "Decolagem confirmada." },
  level_3:                { en: "The first gear shifts cleanly.", pt: "A primeira marcha passa limpa." },
  level_5:                { en: "Out of rookie territory.", pt: "Fora do território novato." },
  level_10:               { en: "The room notices you now.", pt: "A sala já percebe você." },
  level_15:               { en: "You arrive earlier than expected.", pt: "Você chega mais cedo do que o previsto." },
  level_25:                { en: "Rare air up here.", pt: "Ar rarefeito aqui em cima." },
  level_50:               { en: "Thin atmosphere. Bright stars.", pt: "Atmosfera rarefeita. Estrelas brilhantes." },

  // ═══ Real hours ═════════════════════════════════════════════════
  hours_1:                { en: "Sixty honest minutes.", pt: "Sessenta minutos honestos." },
  hours_5:                { en: "Small stack, growing.", pt: "Pilha pequena, crescendo." },
  hours_10:               { en: "Ten hours traded for skill.", pt: "Dez horas trocadas por habilidade." },
  hours_25:               { en: "A day's worth, spread wisely.", pt: "Um dia inteiro, bem distribuído." },
  hours_40:                { en: "A semester's pledge, paid in minutes.", pt: "Uma matrícula semestral, paga em minutos." },
  hours_80:               { en: "A whole academic year on your shoulders.", pt: "Um ano letivo inteiro nos ombros." },
  hours_120:              { en: "Three semesters deep.", pt: "Três semestres de profundidade." },
  hours_240:              { en: "Two CEFR years. Receipts attached.", pt: "Dois anos CEFR. Com comprovante." },
  hours_480:              { en: "Four semesters of pure receipts.", pt: "Quatro semestres de pura prova." },

  // ═══ Speaking / listening ═══════════════════════════════════════
  speaking_hour:          { en: "The mic remembers your voice.", pt: "O microfone já reconhece sua voz." },
  speaking_10h:           { en: "Ten hours of unfaked speech.", pt: "Dez horas de fala sem disfarce." },
  listening_5h:           { en: "Five hours, ears tuned.", pt: "Cinco horas, ouvido calibrado." },

  // ═══ Profile polish ═════════════════════════════════════════════
  profile_avatar:         { en: "A face to attach to the streak.", pt: "Um rosto para colar na sequência." },
  profile_bio:            { en: "A few lines about who shows up.", pt: "Algumas linhas sobre quem aparece aqui." },
  profile_location:       { en: "You picked your coordinates.", pt: "Você escolheu suas coordenadas." },
  profile_birthday:       { en: "The calendar knows your name.", pt: "O calendário sabe o seu nome." },
  teacher_signature:      { en: "Ink becomes authority.", pt: "A tinta vira autoridade." },
  teacher_logo:           { en: "Your brand on the wall.", pt: "Sua marca na parede." },

  // ═══ Teacher legacy ═════════════════════════════════════════════
  teacher_first_classroom:  { en: "Keys to the first room.", pt: "Chaves da primeira sala." },
  teacher_three_classrooms: { en: "A hallway of your own.", pt: "Um corredor inteiro seu." },
  teacher_first_student:    { en: "Your first apprentice.", pt: "Seu primeiro aprendiz." },
  teacher_ten_students:     { en: "A proper circle forms.", pt: "Um círculo de verdade se forma." },
  teacher_fifty_students:   { en: "The room runs warm.", pt: "A sala fica aquecida." },
  teacher_hundred_students: { en: "A school within a school.", pt: "Uma escola dentro da escola." },
  teacher_first_task:       { en: "Homework lands somewhere.", pt: "A tarefa pousa em algum lugar." },
  teacher_ten_tasks:        { en: "Assignments as muscle memory.", pt: "Tarefas viram memória muscular." },
  teacher_fifty_tasks:      { en: "A curator's shelf.", pt: "A prateleira de um curador." },
  teacher_hundred_tasks:    { en: "The assignment orchestra tunes up.", pt: "A orquestra das tarefas se afina." },
  teacher_five_hundred_tasks: { en: "Five hundred doors you opened.", pt: "Quinhentas portas que você abriu." },
  teacher_first_class:      { en: "First bell. Your bell.", pt: "Primeiro sinal. O seu." },
  teacher_ten_classes:      { en: "Ten sessions behind the lectern.", pt: "Dez sessões atrás da tribuna." },
  teacher_fifty_classes:    { en: "The chalk gets used.", pt: "O giz começa a gastar." },
  teacher_hundred_classes:  { en: "Century of bells rung.", pt: "Um século de sinos tocados." },

  // ═══ Teacher artisan ════════════════════════════════════════════
  teacher_first_authored:     { en: "One lesson in your handwriting.", pt: "Uma lição com sua letra." },
  teacher_five_authored:      { en: "Five pages in the binder.", pt: "Cinco páginas na pasta." },
  teacher_twenty_five_authored: { en: "A syllabus you can print.", pt: "Um programa digno de imprimir." },
  teacher_first_cert:         { en: "The first seal stamped.", pt: "O primeiro selo carimbado." },
  teacher_ten_certs:          { en: "Ten diplomas in the wild.", pt: "Dez diplomas correndo mundo." },
  teacher_fifty_certs:        { en: "Provost's quill.", pt: "A pena do reitor." },

  // ═══ CEFR certificates ══════════════════════════════════════════
  cert_a1: { en: "Foundations poured.", pt: "Alicerce feito." },
  cert_a2: { en: "Walls go up.", pt: "As paredes sobem." },
  cert_b1: { en: "The roof takes shape.", pt: "O telhado ganha forma." },
  cert_b2: { en: "Windows open to the wider world.", pt: "Janelas abertas para o mundo." },
  cert_c1: { en: "Fluency knocks on the door.", pt: "A fluência bate à porta." },
  cert_c2: { en: "The language bows to you.", pt: "A língua se curva." },

  // ═══ Easter eggs ════════════════════════════════════════════════
  answer_to_everything:   { en: "Don't panic. You brought a towel.", pt: "Não entre em pânico. Trouxe a toalha." },
  y2k_login:              { en: "Clocks held. You logged in anyway.", pt: "Os relógios aguentaram. Você entrou mesmo assim." },
  yule_log:               { en: "Warm fire, colder verbs.", pt: "Lareira aquecida, verbos congelados." },
  festa_junina:           { en: "Milho, quadrilha, e gerúndio.", pt: "Milho, quadrilha, e gerúndio." },
  founding_100:           { en: "You were here before the paint dried.", pt: "Aqui antes da tinta secar." },
  founding_500:           { en: "Early enough to remember the quiet.", pt: "Cedo o suficiente para lembrar do silêncio." },
  open_source_patron:     { en: "A star lit in the repo's sky.", pt: "Uma estrela acesa no céu do repositório." },
  god_of_free_education:  { en: "Knowledge without a paywall, at scale.", pt: "Conhecimento sem paywall, em escala." },
  freire:                 { en: "\"Reading the world\" — and helping others do it.", pt: "\"Ler o mundo\" — e ajudar os outros a ler." },
  perfect_lesson:         { en: "No mistakes. Nothing to forgive.", pt: "Sem erros. Nada para perdoar." },

  // ═══ Game of Classrooms ═════════════════════════════════════════
  the_wall:               { en: "The Watch never ends.", pt: "A Patrulha nunca termina." },
  winterfell_watch:       { en: "Winter is coming. You are ready.", pt: "O inverno se aproxima. Você está pronto." },
  mother_of_dragons:      { en: "Your children learn to breathe fire.", pt: "Seus filhos aprendem a soltar fogo." },
  hand_of_the_realm:      { en: "The hand that quietly moves the realm.", pt: "A mão que move o reino em silêncio." },
  khaleesi_of_the_great_grass_sea: { en: "Kissed by the sun. Unburnt.", pt: "Beijada pelo sol. Inqueimada." },
  valar_morghulis:        { en: "All men must serve. So must the lessons.", pt: "Todos os homens devem servir. As lições também." },
  valar_dohaeris:         { en: "A hundred seals given freely.", pt: "Cem selos concedidos livremente." },
  iron_throne:            { en: "The realm is yours. Don't sit comfortable.", pt: "O reino é seu. Não se sente confortável." },
  you_know_nothing:       { en: "A hundred lessons — no tutor, no mercy.", pt: "Cem lições — sem tutor, sem piedade." },
  red_wedding:            { en: "A C grade tells the truth.", pt: "A nota C fala a verdade." },
  chaos_is_a_ladder:      { en: "Twenty-five days in one month. Climbed them all.", pt: "Vinte e cinco dias em um mês. Subiu todos." },
  dracarys:               { en: "Level 25 in 90 days. Fast burn.", pt: "Nível 25 em 90 dias. Queima rápida." },

  // ═══ Dragons (continuous session) ═══════════════════════════════
  dragon_egg:             { en: "A small warmth in the palm.", pt: "Um calor pequeno na palma." },
  dragon_wyvern:          { en: "Three hours of wing-flap.", pt: "Três horas de asa batendo." },
  dragon_drogon:          { en: "Six hours in the sky. Unburnt.", pt: "Seis horas no céu. Inqueimado." },
  dragon_vhagar:          { en: "Nine hours of ancient fire.", pt: "Nove horas de fogo antigo." },
  dragon_balerion:        { en: "Twelve hours. The Black Dread remembers.", pt: "Doze horas. O Terror Negro lembra." },

  // ═══ Sharpe & Harper ═══════════════════════════════════════════
  sharpe_tiger:           { en: "Rose from the ranks. Kept rising.", pt: "Subiu das fileiras. Continuou subindo." },
  sharpe_triumph:         { en: "India behind you. The war ahead.", pt: "Índia pra trás. A guerra pra frente." },
  sharpe_rifles:          { en: "The 95th calls you brother.", pt: "O 95º te chama de irmão." },
  sharpe_gold:            { en: "Pockets heavy with earned coin.", pt: "Bolsos pesados de moeda conquistada." },
  sharpe_sword:           { en: "Heavy cavalry blade. Well used.", pt: "Lâmina de cavalaria pesada. Bem usada." },
  sharpe_prey:            { en: "The hunter speaks fluently.", pt: "O caçador fala com fluência." },
  sharpe_escape:          { en: "Two hours. Out of the trap.", pt: "Duas horas. Fora da armadilha." },
  sharpe_eagle:           { en: "A standard taken. A legend begun.", pt: "Um estandarte tomado. Uma lenda começada." },
  sharpe_company:         { en: "A company that answers to one name.", pt: "Uma companhia que atende a um nome só." },
  sharpe_fortress:        { en: "Five walls. All yours to hold.", pt: "Cinco muralhas. Todas suas para defender." },
  sharpe_regiment:        { en: "A regiment raised by hand.", pt: "Um regimento erguido com as mãos." },
  sharpe_siege:           { en: "Badajoz-style patience.", pt: "Paciência estilo Badajoz." },
  sharpe_revenge:         { en: "Cold, patient, inevitable.", pt: "Fria, paciente, inevitável." },
  sharpe_honour:          { en: "Green jacket, polished.", pt: "Jaqueta verde, limpa." },
  sharpe_battle:          { en: "Five hundred shots fired true.", pt: "Quinhentos tiros certeiros." },
  sharpe_waterloo:        { en: "The long war closes. You walked through it.", pt: "A longa guerra termina. Você atravessou." },
  harpers_volley_gun:     { en: "Seven barrels. Seven kills. One day.", pt: "Sete canos. Sete alvos. Um dia." },
  chosen_men:             { en: "You picked them. They don't miss.", pt: "Você os escolheu. Eles não erram." },
  wellingtons_orders:     { en: "Discipline in a red coat.", pt: "Disciplina vestindo casaca vermelha." },

  // ═══ Weather + platform days ════════════════════════════════════
  survivor_42:            { en: "Forty-two and still upright.", pt: "Quarenta e dois e ainda de pé." },
  heatwave_35_3d:         { en: "The asphalt bent. You didn't.", pt: "O asfalto entortou. Você, não." },
  rain_scholar:           { en: "Twenty rainy days, pages turned.", pt: "Vinte dias de chuva, páginas viradas." },
  meio_besta:             { en: "Half the beast. Already unsettling.", pt: "Meia-besta. Já é assustador." },
  a_besta:                { en: "Six hundred sixty-six. Wear it loud.", pt: "Seiscentos e sessenta e seis. Use com orgulho." },
  root_of_all_evil:       { en: "Eight days of the clock, spent on language.", pt: "Oito dias de relógio, investidos no idioma." },

  // ═══ Teacher-only 100 pack (ladder flavors) ═════════════════════
  // Classes Taught
  classes_3:              { en: "Three bells, all yours.", pt: "Três sinos, todos seus." },
  classes_5:              { en: "A week's shift.", pt: "Um turno semanal." },
  classes_15:             { en: "Back in the saddle, steady.", pt: "De volta à sela, firme." },
  classes_25:             { en: "You know the opening lines by heart.", pt: "As primeiras falas já saem de cor." },
  classes_75:             { en: "Quarter-battalion strong.", pt: "Forte como um quarto de batalhão." },
  classes_150:            { en: "A hundred and fifty podium minutes.", pt: "Cento e cinquenta momentos de palanque." },
  classes_200:            { en: "Double century. Lectern wears your hand.", pt: "Dois séculos. A tribuna tem sua mão." },
  classes_300:            { en: "Three hundred syllabi landed.", pt: "Trezentos programas entregues." },
  classes_500:            { en: "The old guard looks at you straight.", pt: "A velha guarda olha direto nos olhos." },
  classes_750:            { en: "Staff meetings where you speak last.", pt: "Reuniões em que você fala por último." },
  classes_1000:           { en: "The thousand-day war, and you still teach.", pt: "A guerra dos mil dias, e você ainda ensina." },
  classes_1500:           { en: "A marathon the body doesn't forget.", pt: "Uma maratona que o corpo não esquece." },
  classes_5000:           { en: "Legend walks in with a mug.", pt: "A lenda entra com uma caneca." },

  // Hours Taught (live)
  hours_taught_1:         { en: "First hour at the mic.", pt: "Primeira hora no microfone." },
  hours_taught_5:         { en: "A shift behind you.", pt: "Um turno completo." },
  hours_taught_10:        { en: "Voice finds its rhythm.", pt: "A voz acha o ritmo." },
  hours_taught_25:        { en: "Quarter of a hundred delivered.", pt: "Um quarto de centena entregue." },
  hours_taught_40:        { en: "A semester handed over, no markup.", pt: "Um semestre entregue, sem markup." },
  hours_taught_80:        { en: "A year's worth of podium time.", pt: "Um ano inteiro de púlpito." },
  hours_taught_120:       { en: "Three semesters of pure delivery.", pt: "Três semestres de entrega pura." },
  hours_taught_200:       { en: "An entire course, given.", pt: "Um curso inteiro, doado." },
  hours_taught_300:       { en: "Guided three hundred hours of other lives.", pt: "Guiou trezentas horas de outras vidas." },
  hours_taught_500:       { en: "Half a thousand hours, minted.", pt: "Meio mil de horas, cunhadas." },
  hours_taught_750:       { en: "Three-quarter mastery. Rare gear.", pt: "Três quartos da maestria. Engrenagem rara." },
  hours_taught_1000:      { en: "Thousand-hour sage.", pt: "Sábio de mil horas." },

  // Assignments Created
  assigns_3:              { en: "Three scrolls nailed.", pt: "Três pergaminhos pregados." },
  assigns_5:              { en: "Starter set locked.", pt: "Kit inicial montado." },
  assigns_25:             { en: "Pace has a hum now.", pt: "O ritmo tem um zumbido agora." },
  assigns_75:             { en: "Cabinet fills.", pt: "O armário enche." },
  assigns_200:            { en: "Two hundred homeworks posted.", pt: "Duzentas tarefas enviadas." },
  assigns_300:            { en: "Quarterly output — steady.", pt: "Produção trimestral — firme." },
  assigns_750:            { en: "Engine hums without supervision.", pt: "O motor ronrona sem supervisão." },
  assigns_1000:           { en: "A thousand tasks later, you're faster.", pt: "Mil tarefas depois, você é mais rápido." },
  assigns_1500:           { en: "Industrious is an understatement.", pt: "Industrioso é pouco." },
  assigns_2000:           { en: "Welcome to the forge.", pt: "Bem-vindo à forja." },
  assigns_3000:           { en: "Three thousand orders. No regrets.", pt: "Três mil ordens. Sem arrependimento." },
  master_of_puppets:      { en: "Pulling strings you taught them to tie.", pt: "Puxando cordas que você ensinou a dar." },

  // Tenure
  tenure_30:              { en: "Month one, filed.", pt: "Mês um, arquivado." },
  tenure_60:              { en: "Two moons over the same desk.", pt: "Duas luas sobre a mesma mesa." },
  tenure_90:              { en: "A quarter in the building.", pt: "Um trimestre no prédio." },
  tenure_180:             { en: "Six months and still here.", pt: "Seis meses e ainda aqui." },
  tenure_365:             { en: "Anniversary of one full lap.", pt: "Aniversário de uma volta inteira." },
  tenure_730:             { en: "Two years. Furniture knows you.", pt: "Dois anos. Os móveis te reconhecem." },
  tenure_1095:            { en: "Third anniversary quietly logged.", pt: "Terceiro aniversário, silenciosamente registrado." },
  tenure_1825:            { en: "Five-year tenure. Unshakeable.", pt: "Tenure de cinco anos. Inabalável." },
  tenure_3650:            { en: "A decade. Rings on the tree.", pt: "Uma década. Anéis na árvore." },

  // Lessons Authored
  authored_3:             { en: "Three lessons in your handwriting.", pt: "Três lições com sua letra." },
  authored_10:            { en: "First textbook shelf mounted.", pt: "Primeira prateleira montada." },
  authored_15:            { en: "Fifteen pieces, your voice throughout.", pt: "Quinze peças, sua voz em cada uma." },
  authored_50:            { en: "A syllabus out of thin air.", pt: "Um programa feito do ar." },
  authored_75:            { en: "Prolific becomes a fact.", pt: "Prolífico vira fato." },
  authored_100:           { en: "Centennial scribe.", pt: "Escriba centenário." },
  authored_150:           { en: "The shelf is full.", pt: "A prateleira está cheia." },
  authored_200:           { en: "Two-hundred-quill residency.", pt: "Residência das duzentas penas." },
  authored_300:           { en: "Canon of 300. Curated.", pt: "Cânone de 300. Curado." },
  authored_500:           { en: "A whole library.", pt: "Uma biblioteca inteira." },
  authored_1000:          { en: "Thousand-lesson legacy. Quiet weight.", pt: "Legado de mil lições. Peso silencioso." },

  // Students Added
  students_3:             { en: "Three seeds in the soil.", pt: "Três sementes na terra." },
  students_5:             { en: "A small cohort, loud already.", pt: "Um grupo pequeno, já barulhento." },
  students_15:            { en: "Fifteen apprentices in the workshop.", pt: "Quinze aprendizes no ateliê." },
  students_25:            { en: "Full class. Full responsibility.", pt: "Sala cheia. Responsabilidade cheia." },
  shes_a_mother:          { en: "She's a mother. Thirty kids.", pt: "Ela é mãe. Trinta filhos." },
  students_75:            { en: "Busy schedule, bigger heart.", pt: "Agenda lotada, coração maior." },
  students_150:           { en: "Big roster, bigger ambitions.", pt: "Lista grande, ambições maiores." },
  students_200:           { en: "A school within your building.", pt: "Uma escola dentro do seu prédio." },
  students_500:           { en: "Five hundred trusting eyes.", pt: "Quinhentos pares de olhos confiantes." },

  // Students Certified
  certified_1:            { en: "First diploma, real ink.", pt: "Primeiro diploma, tinta de verdade." },
  certified_3:            { en: "Triple graduation.", pt: "Tripla formatura." },
  certified_5:            { en: "Small class, big day.", pt: "Turma pequena, dia grande." },
  certified_15:           { en: "Fifteen names you changed.", pt: "Quinze nomes que você mudou." },
  certified_50:           { en: "Fifty alumni walk the world.", pt: "Cinquenta ex-alunos pelo mundo." },
  certified_75:           { en: "Graduation day on a loop.", pt: "Formatura em loop." },
  certified_100:          { en: "Century of certified lives.", pt: "Um século de vidas certificadas." },
  certified_250:          { en: "Alumni association founded by you.", pt: "Associação de ex-alunos fundada por você." },

  // Certificates Issued (ceremonial)
  certs_3:                { en: "Triple seal on the wax.", pt: "Selo triplo no lacre." },
  certs_5:                { en: "Five seals, five signatures.", pt: "Cinco selos, cinco assinaturas." },
  certs_25:               { en: "Seal bearer of the school.", pt: "Portador do selo da escola." },
  certs_75:               { en: "Parchment priest.", pt: "Sacerdote do pergaminho." },
  certs_200:              { en: "A small factory of honor.", pt: "Uma pequena fábrica de honra." },
  certs_500:              { en: "Archive keeper. Many keys.", pt: "Guardião do arquivo. Muitas chaves." },

  // Classrooms Created
  classrooms_2:           { en: "Two rooms, both yours.", pt: "Duas salas, as duas suas." },
  classrooms_7:           { en: "Seven houses of learning.", pt: "Sete casas do saber." },
  classrooms_10:          { en: "Ten-room academy.", pt: "Academia de dez salas." },
  classrooms_15:          { en: "Wing extended.", pt: "Ala ampliada." },
  classrooms_20:          { en: "Campus builder.", pt: "Construtor de campus." },

  // Simultaneous classrooms
  concur_classrooms_2:    { en: "Two rooms open. One you.", pt: "Duas salas abertas. Um você." },
  concur_classrooms_3:    { en: "Three plates spinning.", pt: "Três pratos girando." },
  concur_classrooms_5:    { en: "Juggling five without looking.", pt: "Malabarismo com cinco sem olhar." },
  concur_classrooms_7:    { en: "Seven-star conductor.", pt: "Regente de sete estrelas." },
  concur_classrooms_10:   { en: "Ten rooms live. How?", pt: "Dez salas ao vivo. Como?" },

  // Concurrent students
  concur_students_5:      { en: "Five eager pairs of eyes.", pt: "Cinco pares de olhos atentos." },
  concur_students_15:     { en: "Fifteen voices, one mic.", pt: "Quinze vozes, um microfone." },
  concur_students_30:     { en: "Can they all hear? Apparently yes.", pt: "Todos escutam? Pelo visto, sim." },
  concur_students_50:     { en: "A lecture hall by any other name.", pt: "Um auditório com outro nome." },

  // Mentor grants
  mentor_10:              { en: "First ten mentor moves logged.", pt: "Primeiros dez atos de mentoria registrados." },
  mentor_25:              { en: "Mentor muscle forming.", pt: "Músculo de mentoria se formando." },
  mentor_50:              { en: "Fifty quiet interventions.", pt: "Cinquenta intervenções silenciosas." },
  mentor_250:             { en: "Tireless. Students feel it.", pt: "Incansável. Os alunos sentem." },
  mentor_500:             { en: "Mentor machine, well oiled.", pt: "Máquina de mentor, bem azeitada." },
  mentor_1000:            { en: "Hall of mentors. Your bust, too.", pt: "Panteão de mentores. Seu busto, também." },
};

/**
 * Lookup helper. Returns the locale-specific flavor or null when
 * the badge type has no custom flavor yet (the caller should fall
 * back to the name + description in that case).
 */
export function badgeFlavor(
  type: string,
  locale: "en" | "pt-BR" | string,
): string | null {
  const entry = BADGE_FLAVORS[type];
  if (!entry) return null;
  return locale === "pt-BR" ? entry.pt : entry.en;
}
