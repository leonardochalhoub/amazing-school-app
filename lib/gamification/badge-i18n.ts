import type { BadgeRarity } from "./config";
import type { Locale } from "@/lib/i18n/translations";

interface BadgeText {
  name: string;
  description: string;
}

const BADGE_I18N: Record<Locale, Record<string, BadgeText>> = {
  en: {
    welcome_aboard: {
      name: "First Contact",
      description: "Joined Amazing School — welcome!",
    },
    first_lesson: {
      name: "First Signal",
      description: "Completed your first lesson",
    },
    first_chat: {
      name: "Neural Handshake",
      description: "Started your first AI conversation",
    },
    five_lessons: {
      name: "Momentum",
      description: "Completed 5 lessons",
    },
    bookworm: {
      name: "Bookworm",
      description: "Completed 25 lessons",
    },
    streak_7: {
      name: "Ignited",
      description: "7-day streak",
    },
    streak_30: {
      name: "Unstoppable",
      description: "30-day streak",
    },
    streak_90: {
      name: "Quarter Orbit",
      description: "90-day streak",
    },
    music_lover: {
      name: "Soundwave",
      description: "Completed 5 music lessons",
    },
    level_5: {
      name: "Rising Signal",
      description: "Reached Level 5",
    },
    level_10: {
      name: "Constellation",
      description: "Reached Level 10",
    },
    level_25: {
      name: "Nova",
      description: "Reached Level 25",
    },
    level_50: {
      name: "Supernova",
      description: "Reached Level 50",
    },
    perfect_lesson: {
      name: "Clean Sweep",
      description: "Finished a lesson with zero mistakes",
    },
    cert_a1: {
      name: "Ignition",
      description: "CEFR A1 certificate · Beginner",
    },
    cert_a2: {
      name: "Orbit",
      description: "CEFR A2 certificate · Pre-Intermediate",
    },
    cert_b1: {
      name: "Trajectory",
      description: "CEFR B1 certificate · Intermediate",
    },
    cert_b2: {
      name: "Navigator",
      description: "CEFR B2 certificate · Upper-Intermediate",
    },
    cert_c1: {
      name: "Mastery",
      description: "CEFR C1 certificate · Advanced",
    },
    cert_c2: {
      name: "Proficiency",
      description: "CEFR C2 certificate · Proficient",
    },
  },
  "pt-BR": {
    welcome_aboard: {
      name: "Primeiro Contato",
      description: "Entrou na Amazing School — boas-vindas!",
    },
    first_lesson: {
      name: "Primeiro Sinal",
      description: "Concluiu a primeira lição",
    },
    first_chat: {
      name: "Aperto de Mão Neural",
      description: "Iniciou sua primeira conversa com a IA",
    },
    five_lessons: {
      name: "Embalado",
      description: "Concluiu 5 lições",
    },
    bookworm: {
      name: "Rato de Biblioteca",
      description: "Concluiu 25 lições",
    },
    streak_7: {
      name: "Em Chamas",
      description: "Sequência de 7 dias",
    },
    streak_30: {
      name: "Imparável",
      description: "Sequência de 30 dias",
    },
    streak_90: {
      name: "Órbita Trimestral",
      description: "Sequência de 90 dias",
    },
    music_lover: {
      name: "Onda Sonora",
      description: "Concluiu 5 lições de música",
    },
    level_5: {
      name: "Sinal Crescente",
      description: "Chegou ao Nível 5",
    },
    level_10: {
      name: "Constelação",
      description: "Chegou ao Nível 10",
    },
    level_25: {
      name: "Nova",
      description: "Chegou ao Nível 25",
    },
    level_50: {
      name: "Supernova",
      description: "Chegou ao Nível 50",
    },
    perfect_lesson: {
      name: "Gabaritou",
      description: "Terminou uma lição sem errar nenhuma",
    },
    cert_a1: {
      name: "Ignição",
      description: "Certificado CEFR A1 · Iniciante",
    },
    cert_a2: {
      name: "Órbita",
      description: "Certificado CEFR A2 · Pré-Intermediário",
    },
    cert_b1: {
      name: "Trajetória",
      description: "Certificado CEFR B1 · Intermediário",
    },
    cert_b2: {
      name: "Navegador",
      description: "Certificado CEFR B2 · Intermediário Superior",
    },
    cert_c1: {
      name: "Maestria",
      description: "Certificado CEFR C1 · Avançado",
    },
    cert_c2: {
      name: "Proficiência",
      description: "Certificado CEFR C2 · Proficiente",
    },

    // ─── Milestone expansions ───────────────────────────────────
    ten_lessons:      { name: "Acelerando", description: "Concluiu 10 lições" },
    fifty_lessons:    { name: "Desbravador", description: "Concluiu 50 lições" },
    hundred_lessons:  { name: "Centenário", description: "Concluiu 100 lições" },
    two_fifty_lessons:   { name: "Viajante", description: "Concluiu 250 lições" },
    five_hundred_lessons:{ name: "Peregrino", description: "Concluiu 500 lições" },
    one_thousand_lessons:{ name: "Arconte", description: "Concluiu 1000 lições" },
    ten_chats:        { name: "Conversador", description: "Iniciou 10 conversas com IA" },
    hundred_chats:    { name: "Interlocutor", description: "Iniciou 100 conversas com IA" },
    first_song:       { name: "Primeiro Acorde", description: "Concluiu sua primeira música" },
    five_songs:       { name: "Playlist Iniciada", description: "Concluiu 5 músicas" },
    twenty_songs:     { name: "Mixtape", description: "Concluiu 20 músicas" },
    fifty_songs:      { name: "Artista do Álbum", description: "Concluiu 50 músicas" },
    hundred_songs:    { name: "Disco de Platina", description: "Concluiu 100 músicas" },

    // ─── Streak expansions ──────────────────────────────────────
    streak_3:         { name: "Aquecendo", description: "Sequência de 3 dias" },
    streak_14:        { name: "Acesa", description: "Sequência de 14 dias" },
    streak_60:        { name: "Combustão", description: "Sequência de 60 dias" },
    streak_180:       { name: "Halo de Meio Ano", description: "Sequência de 180 dias" },
    streak_365:       { name: "Volta Completa", description: "Sequência de 365 dias — um ano inteiro" },

    // ─── Level expansions ───────────────────────────────────────
    level_2:          { name: "Faísca", description: "Chegou ao Nível 2" },
    level_3:          { name: "Clarão", description: "Chegou ao Nível 3" },
    level_15:         { name: "Pulsar", description: "Chegou ao Nível 15" },

    // ─── Real hours ─────────────────────────────────────────────
    hours_1:          { name: "Primeira Hora", description: "Passou sua primeira hora na plataforma" },
    hours_5:          { name: "Cinco Horas", description: "5 horas reais registradas" },
    hours_10:         { name: "Marca das 10 Horas", description: "10 horas reais registradas" },
    hours_25:         { name: "Quarto de Cem", description: "25 horas reais — ficando sério" },
    hours_40:         { name: "Semestre CEFR", description: "40 horas reais — um semestre CEFR" },
    hours_80:         { name: "Ano Acadêmico", description: "80 horas reais — um ano CEFR" },
    hours_120:        { name: "Erudito", description: "120 horas reais" },
    hours_240:        { name: "Residente Bianual", description: "240 horas reais — dois anos CEFR" },
    hours_480:        { name: "Quatro Semestres", description: "480 horas reais — quatro semestres CEFR" },
    speaking_hour:    { name: "Primeira Fala", description: "1 hora no Lab de Fala" },
    speaking_10h:     { name: "Orador", description: "10 horas no Lab de Fala" },
    listening_5h:     { name: "Ouvido Treinado", description: "5 horas ouvindo músicas na plataforma" },

    // ─── Profile polish ─────────────────────────────────────────
    profile_avatar:    { name: "Rosto Visível", description: "Enviou uma foto de perfil" },
    profile_bio:       { name: "Apresentado", description: "Escreveu uma bio no perfil" },
    profile_location:  { name: "No Mapa", description: "Adicionou sua cidade ao perfil" },
    profile_birthday:  { name: "Bolo Calibrado", description: "Registrou seu aniversário" },
    teacher_signature: { name: "Assinado e Selado", description: "Ativou sua assinatura de professor" },
    teacher_logo:      { name: "Sua Marca", description: "Enviou o logo da sua escola" },

    // ─── Teacher legacy ─────────────────────────────────────────
    teacher_first_classroom:  { name: "Portas Abertas", description: "Criou sua primeira turma" },
    teacher_three_classrooms: { name: "Ala", description: "Gerenciando 3 turmas" },
    teacher_first_student:    { name: "Primeiro Aluno", description: "Adicionou seu primeiro aluno" },
    teacher_ten_students:     { name: "Turma de Dez", description: "Ensinando 10 alunos" },
    teacher_fifty_students:   { name: "Sala Cheia", description: "Ensinando 50 alunos" },
    teacher_hundred_students: { name: "Mentor", description: "Ensinando 100 alunos" },
    teacher_first_task:       { name: "Primeira Tarefa", description: "Enviou sua primeira tarefa" },
    teacher_ten_tasks:        { name: "Mestre das Tarefas", description: "Criou 10 tarefas" },
    teacher_fifty_tasks:      { name: "Curador", description: "Criou 50 tarefas" },
    teacher_hundred_tasks:    { name: "Regente", description: "Criou 100 tarefas" },
    teacher_five_hundred_tasks: { name: "Almoxarife", description: "Criou 500 tarefas" },
    teacher_first_class:      { name: "Toca o Sino", description: "Ministrou sua primeira aula ao vivo" },
    teacher_ten_classes:      { name: "Chamada", description: "Ministrou 10 aulas ao vivo" },
    teacher_fifty_classes:    { name: "Experiente", description: "Ministrou 50 aulas ao vivo" },
    teacher_hundred_classes:  { name: "Professor Centurião", description: "Ministrou 100 aulas ao vivo" },
    teacher_first_authored:   { name: "Primeiro Rascunho", description: "Publicou sua primeira lição autoral" },
    teacher_five_authored:    { name: "Prateleira Iniciada", description: "Publicou 5 lições autorais" },
    teacher_twenty_five_authored: { name: "Livro-Texto", description: "Publicou 25 lições autorais" },
    teacher_first_cert:       { name: "Primeira Honraria", description: "Emitiu seu primeiro certificado" },
    teacher_ten_certs:        { name: "Formatura", description: "Emitiu 10 certificados" },
    teacher_fifty_certs:      { name: "Reitor", description: "Emitiu 50 certificados" },

    // ─── Easter eggs + crown ────────────────────────────────────
    answer_to_everything:  { name: "A Resposta", description: "Completou 42 anos na plataforma" },
    y2k_login:             { name: "Y2K", description: "Entrou em 1º de janeiro" },
    yule_log:              { name: "Tronco de Natal", description: "Entrou no Dia de Natal" },
    festa_junina:          { name: "Festa Junina", description: "Ativo na semana da Festa Junina (20-30/jun)" },
    founding_100:          { name: "Fundadores 100", description: "Entre os primeiros 100 usuários" },
    founding_500:          { name: "Fundadores 500", description: "Entre os primeiros 500 usuários" },
    open_source_patron:    { name: "Mecenas Open-Source", description: "Declarou apoio ao projeto open-source" },
    god_of_free_education: { name: "Deus/Deusa da Educação Gratuita", description: "Ministrou 100+ aulas ao vivo e emitiu 10+ certificados" },
    freire:                { name: "Freire", description: "Certificou 25 alunos distintos — o legado de Paulo Freire" },

    // ─── Game of Classrooms ─────────────────────────────────────
    the_wall:               { name: "A Muralha", description: "Sequência de 100 dias. A Patrulha nunca termina." },
    winterfell_watch:       { name: "Vigília de Winterfell", description: "50 lições concluídas durante o inverno brasileiro (Jun–Ago)" },
    mother_of_dragons:      { name: "Mãe dos Dragões", description: "Chocou 3 turmas e criou 25 alunos para dobrar os joelhos" },
    hand_of_the_realm:      { name: "Mão do Reino", description: "100 créditos de mentor — serviço incansável" },
    khaleesi_of_the_great_grass_sea: { name: "Khaleesi do Grande Mar de Grama", description: "240 horas reais — paciência de conquistador" },
    valar_morghulis:        { name: "Valar Morghulis", description: "Concluiu 1000 lições — todos os homens devem servir" },
    valar_dohaeris:         { name: "Valar Dohaeris", description: "Emitiu 100 certificados — todos os homens devem servir" },
    iron_throne:            { name: "O Trono de Ferro", description: "100 aulas, 50 certificados, 100 alunos. O reino é seu." },
    you_know_nothing:       { name: "Você Não Sabe Nada", description: "Concluiu 100 lições sem falar com a IA" },
    red_wedding:            { name: "Casamento Vermelho", description: "Emitiu um certificado com nota C — honestidade brutal" },
    chaos_is_a_ladder:      { name: "Caos é uma Escada", description: "Ativo em 25+ dias distintos em um único mês" },
    dracarys:               { name: "Dracarys", description: "Chegou ao nível 25 em menos de 90 dias — velocidade incandescente" },

    // ─── Dragons ─────────────────────────────────────────────────
    dragon_egg:      { name: "Ovo de Dragão", description: "Sessão de estudo de uma hora direto" },
    dragon_wyvern:   { name: "Wyvern", description: "Sessão de estudo de três horas direto" },
    dragon_drogon:   { name: "Drogon", description: "Sessão de seis horas direto — o favorito da Não-Queimada" },
    dragon_vhagar:   { name: "Vhagar", description: "Sessão de nove horas — o segundo maior dragão de Westeros" },
    dragon_balerion: { name: "Balerion, o Terror Negro", description: "Sessão de doze horas — o maior dragão a dominar Westeros" },

    // ─── Sharpe & Harper ────────────────────────────────────────
    sharpe_tiger:         { name: "Tigre de Sharpe", description: "Nível 3 — subiu das fileiras" },
    sharpe_triumph:       { name: "Triunfo de Sharpe", description: "Nível 5 — sua primeira vitória real" },
    sharpe_rifles:        { name: "Rifles de Sharpe", description: "Concluiu 25 lições — honre seu corpo" },
    sharpe_gold:          { name: "Ouro de Sharpe", description: "Acumulou 10.000 XP — fortuna de soldado" },
    sharpe_sword:         { name: "Espada de Sharpe", description: "Concluiu 100 lições — maestria da cavalaria pesada" },
    sharpe_prey:          { name: "Presa de Sharpe", description: "Iniciou 10 conversas com IA — o caçador e o caçado" },
    sharpe_escape:        { name: "Fuga de Sharpe", description: "Sessão de duas horas direto — escapou da armadilha" },
    sharpe_eagle:         { name: "Águia de Sharpe", description: "Emitiu seu primeiro certificado — um estandarte capturado" },
    sharpe_company:       { name: "Companhia de Sharpe", description: "10 alunos e 10 tarefas — uma companhia de verdade" },
    sharpe_fortress:      { name: "Fortaleza de Sharpe", description: "Gerenciando 5 turmas — mantendo as muralhas" },
    sharpe_regiment:      { name: "Regimento de Sharpe", description: "50 alunos em 3 turmas — um regimento próprio" },
    sharpe_siege:         { name: "Cerco de Sharpe", description: "Sequência de 30 dias + 50 lições — resistência estilo Badajoz" },
    sharpe_revenge:       { name: "Vingança de Sharpe", description: "Sequência de 60 dias — fria, paciente, inevitável" },
    sharpe_honour:        { name: "Honra de Sharpe", description: "Perfil completo em todos os campos" },
    sharpe_battle:        { name: "Batalha de Sharpe", description: "500 lições concluídas — as fileiras" },
    sharpe_waterloo:      { name: "Waterloo de Sharpe", description: "1000 lições E nível 25 — você viu o fim das Guerras Napoleônicas" },
    harpers_volley_gun:   { name: "Canhão de Harper", description: "Concluiu 7 lições em um único dia — sete canos, sete tiros" },
    chosen_men:           { name: "Homens Escolhidos", description: "Emitiu 10 certificados — sua própria elite" },
    wellingtons_orders:   { name: "Ordens de Wellington", description: "100 lições E sequência de 30 dias — obediência disciplinada" },

    // ─── Weather & platform days ────────────────────────────────
    survivor_42:     { name: "Sobrevivi a +42°", description: "Sobreviveu a um dia acima de 42°C na plataforma" },
    heatwave_35_3d:  { name: "Onda de Calor de Três Dias", description: "Três dias consecutivos com 35°C ou mais" },
    rain_scholar:    { name: "Gosto de Estudar na Chuva", description: "Estudou em 20 dias de chuva distintos" },
    meio_besta:      { name: "Meio-Besta · Dia 333", description: "333 dias ativos distintos — metade da besta" },
    a_besta:         { name: "A Besta · 666", description: "666 dias ativos distintos — o número da besta" },
    root_of_all_evil:{ name: "Raiz de Todo Mal", description: "192 horas reais estudadas — oito dias inteiros do relógio" },

    // ─── Teacher-pack 100: classes taught ───────────────────────
    classes_3:    { name: "Primeiro Trio", description: "3 aulas ministradas" },
    classes_5:    { name: "Sequência de Cinco", description: "5 aulas ministradas" },
    classes_15:   { name: "De Volta à Sela", description: "15 aulas ministradas" },
    classes_25:   { name: "Instrutor Veterano", description: "25 aulas ministradas" },
    classes_75:   { name: "Quarto de Batalhão", description: "75 aulas ministradas" },
    classes_150:  { name: "Quadro de Honra", description: "150 aulas ministradas" },
    classes_200:  { name: "Duplo Centenário", description: "200 aulas ministradas" },
    classes_300:  { name: "Manto de Professor", description: "300 aulas ministradas" },
    classes_500:  { name: "Velha Guarda", description: "500 aulas ministradas" },
    classes_750:  { name: "Presença Regular", description: "750 aulas ministradas" },
    classes_1000: { name: "Guerra dos Mil Dias", description: "1.000 aulas ministradas" },
    classes_1500: { name: "Maratona Instrutiva", description: "1.500 aulas ministradas" },
    classes_5000: { name: "Lenda das Aulas", description: "5.000 aulas ministradas" },

    // hours taught
    hours_taught_1:    { name: "Primeira Hora Ensinada", description: "1 hora de aulas ao vivo ministradas" },
    hours_taught_5:    { name: "Turno de Cinco Horas", description: "5 horas de aulas ao vivo ministradas" },
    hours_taught_10:   { name: "Turno Duplo", description: "10 horas de aulas ao vivo ministradas" },
    hours_taught_25:   { name: "Quarto de Cem", description: "25 horas de aulas ao vivo ministradas" },
    hours_taught_40:   { name: "Doação Semestral", description: "40 horas — um semestre CEFR completo" },
    hours_taught_80:   { name: "Ano Acadêmico Doado", description: "80 horas — um ano CEFR" },
    hours_taught_120:  { name: "Três Semestres", description: "120 horas ministradas" },
    hours_taught_200:  { name: "Curso Completo", description: "200 horas ministradas" },
    hours_taught_300:  { name: "Guiou 300 Horas", description: "300 horas ministradas" },
    hours_taught_500:  { name: "Meio Milhar", description: "500 horas ministradas" },
    hours_taught_750:  { name: "Três Quartos da Maestria", description: "750 horas ministradas" },
    hours_taught_1000: { name: "Sábio das Mil Horas", description: "1.000 horas ministradas" },

    // assignments
    assigns_3:     { name: "Três Fixadas", description: "3 tarefas criadas" },
    assigns_5:     { name: "Kit Inicial", description: "5 tarefas criadas" },
    assigns_25:    { name: "Vinte e Cinco Enviadas", description: "25 tarefas criadas" },
    assigns_75:    { name: "Armário de Pergaminhos", description: "75 tarefas criadas" },
    assigns_200:   { name: "Duzentas Tarefas", description: "200 tarefas criadas" },
    assigns_300:   { name: "Produção Trimestral", description: "300 tarefas criadas" },
    assigns_750:   { name: "Motor de Tarefas", description: "750 tarefas criadas" },
    assigns_1000:  { name: "Mil Tarefas", description: "1.000 tarefas criadas" },
    assigns_1500:  { name: "Industrioso", description: "1.500 tarefas criadas" },
    assigns_2000:  { name: "A Forja", description: "2.000 tarefas criadas" },
    assigns_3000:  { name: "Três Mil Ordens", description: "3.000 tarefas criadas" },
    master_of_puppets: { name: "Mestre das Marionetes", description: "5.000 tarefas criadas — \"obedeça seu mestre\"" },

    // tenure
    tenure_30:   { name: "Mês Um", description: "30 dias na plataforma" },
    tenure_60:   { name: "Duas Luas", description: "60 dias na plataforma" },
    tenure_90:   { name: "Trimestre", description: "90 dias na plataforma" },
    tenure_180:  { name: "Veterano de Meio Ano", description: "180 dias na plataforma" },
    tenure_365:  { name: "Um Ano Dentro", description: "365 dias na plataforma" },
    tenure_730:  { name: "Dois Anos Dentro", description: "2 anos na plataforma" },
    tenure_1095: { name: "Terceiro Aniversário", description: "3 anos na plataforma" },
    tenure_1825: { name: "Tenure de Cinco Anos", description: "5 anos na plataforma" },
    tenure_3650: { name: "Década de Ensino", description: "10 anos na plataforma" },

    // authored
    authored_3:    { name: "Três Publicadas", description: "3 lições autorais" },
    authored_10:   { name: "Primeira Prateleira", description: "10 lições autorais" },
    authored_15:   { name: "Quinze Lições", description: "15 lições autorais" },
    authored_50:   { name: "Construtor de Programa", description: "50 lições autorais" },
    authored_75:   { name: "Autor Prolífico", description: "75 lições autorais" },
    authored_100:  { name: "Escriba Centenário", description: "100 lições autorais" },
    authored_150:  { name: "Prateleira Cheia", description: "150 lições autorais" },
    authored_200:  { name: "Pena de 200", description: "200 lições autorais" },
    authored_300:  { name: "Cânone de 300", description: "300 lições autorais" },
    authored_500:  { name: "Biblioteca de Leo", description: "500 lições autorais" },
    authored_1000: { name: "Legado de Mil Lições", description: "1.000 lições autorais" },

    // students added
    students_3:    { name: "Primeiros Três", description: "3 alunos adicionados" },
    students_5:    { name: "Pequena Turma", description: "5 alunos adicionados" },
    students_15:   { name: "Quinze Aprendizes", description: "15 alunos adicionados" },
    students_25:   { name: "Sala Completa", description: "25 alunos adicionados" },
    shes_a_mother: { name: "Ela é uma Mãe", description: "30 alunos adicionados — \"ela é uma mãe\"" },
    students_75:   { name: "Professor Ocupado", description: "75 alunos adicionados" },
    students_150:  { name: "Lista Grande", description: "150 alunos adicionados" },
    students_200:  { name: "Escola Cheia", description: "200 alunos adicionados" },
    students_500:  { name: "Quinhentos Servidos", description: "500 alunos adicionados" },

    // students certified
    certified_1:   { name: "Primeiro Diploma", description: "1 aluno certificado" },
    certified_3:   { name: "Formatura Tripla", description: "3 alunos certificados" },
    certified_5:   { name: "Pequena Turma de Formatura", description: "5 alunos certificados" },
    certified_15:  { name: "Quinze Certificados", description: "15 alunos certificados" },
    certified_50:  { name: "Cinquenta Ex-Alunos", description: "50 alunos certificados" },
    certified_75:  { name: "Dia de Formatura", description: "75 alunos certificados" },
    certified_100: { name: "Centenário de Certificados", description: "100 alunos certificados" },
    certified_250: { name: "Associação de Ex-Alunos", description: "250 alunos certificados" },

    // certs issued
    certs_3:   { name: "Selo Triplo", description: "3 certificados emitidos" },
    certs_5:   { name: "Selo Quíntuplo", description: "5 certificados emitidos" },
    certs_25:  { name: "Portador do Selo", description: "25 certificados emitidos" },
    certs_75:  { name: "Sacerdote do Pergaminho", description: "75 certificados emitidos" },
    certs_200: { name: "Fábrica de Pergaminhos", description: "200 certificados emitidos" },
    certs_500: { name: "Guardião do Arquivo", description: "500 certificados emitidos" },

    // classrooms
    classrooms_2:  { name: "Duas Turmas", description: "2 turmas criadas" },
    classrooms_7:  { name: "Sete Casas", description: "7 turmas criadas" },
    classrooms_10: { name: "Academia de Dez Salas", description: "10 turmas criadas" },
    classrooms_15: { name: "Ala Ampliada", description: "15 turmas criadas" },
    classrooms_20: { name: "Construtor de Campus", description: "20 turmas criadas" },

    // concurrent classrooms
    concur_classrooms_2:  { name: "Professor Multissala", description: "Gerenciando 2 turmas simultaneamente" },
    concur_classrooms_3:  { name: "Três de Uma Vez", description: "Gerenciando 3 turmas simultaneamente" },
    concur_classrooms_5:  { name: "Malabarismo com Cinco", description: "Gerenciando 5 turmas simultaneamente" },
    concur_classrooms_7:  { name: "Regente de Sete Estrelas", description: "Gerenciando 7 turmas simultaneamente" },
    concur_classrooms_10: { name: "Dez Salas ao Vivo", description: "Gerenciando 10 turmas simultaneamente" },

    // concurrent students
    concur_students_5:  { name: "Cinco Alunos ao Vivo", description: "5 alunos ativos ao mesmo tempo" },
    concur_students_15: { name: "Quinze ao Vivo", description: "15 alunos ativos ao mesmo tempo" },
    concur_students_30: { name: "Sala Cheia — Eles me Ouvem?", description: "30 alunos ativos ao mesmo tempo" },
    concur_students_50: { name: "Auditório", description: "50 alunos ativos ao mesmo tempo" },

    // mentor grants
    mentor_10:   { name: "Primeiro Crédito de Mentor", description: "10 créditos de mentor registrados" },
    mentor_25:   { name: "Vinte e Cinco Atos de Mentor", description: "25 créditos de mentor registrados" },
    mentor_50:   { name: "Cinquenta Atos de Mentor", description: "50 créditos de mentor registrados" },
    mentor_250:  { name: "Mentor Incansável", description: "250 créditos de mentor registrados" },
    mentor_500:  { name: "Máquina de Mentor", description: "500 créditos de mentor registrados" },
    mentor_1000: { name: "Panteão dos Mentores", description: "1.000 créditos de mentor registrados" },
  },
};

const RARITY_I18N: Record<Locale, Record<BadgeRarity, string>> = {
  en: {
    common: "Common",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
    mythic: "Mythic",
  },
  "pt-BR": {
    common: "Comum",
    rare: "Raro",
    epic: "Épico",
    legendary: "Lendário",
    mythic: "Mítico",
  },
};

export function translateBadge(
  type: string,
  locale: Locale,
  fallback: BadgeText,
): BadgeText {
  return BADGE_I18N[locale]?.[type] ?? BADGE_I18N.en[type] ?? fallback;
}

export function translateRarity(rarity: BadgeRarity, locale: Locale): string {
  return RARITY_I18N[locale]?.[rarity] ?? RARITY_I18N.en[rarity] ?? rarity;
}
