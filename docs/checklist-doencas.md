# Checklist — atualização da base de doenças (problemas_farm)

Puxado direto da Data Table `problemas_farm` no n8n (via API) em 2026-08-12, ordenado por `id` (ordem de criação da linha).

**116 doenças** no total (79 originais + 9 gaps de mercado + 12 gaps dos protocolos CFF + 15 gaps de crônicos/homem/infantil/ORL/pele/viagem/feminino, todas adicionadas/atualizadas em 2026-08-12). Marcar aqui conforme for rodando o workflow **Balconista - Regenerar Problema** pra cada uma. Todas concluídas.

⚠️ A API de Data Tables do n8n pagina em blocos de 100 linhas (`nextCursor`) — ao consultar via API sempre checar se há próxima página, senão linhas do final somem da leitura (não da tabela).

⚠️ **Possível duplicata**: `id 11` (GASTRITE (INFLAMAÇÃO DA MUCOSA GÁSTRICA), já preenchida) e `id 56`
(INFLAMAÇÃO DA MUCOSA GÁSTRICA, pendente) parecem ser o mesmo problema com nomes diferentes — vale
decidir se mescla ou apaga uma das duas antes de gerar conteúdo novo pra `56`. Não encontrei outras
repetições de nome exatas na tabela.

- [x] `2` CONTRATURA MUSCULAR
- [x] `3` DOR NAS ARTICULAÇÕES
- [x] `4` TOSSE (SECA, PRODUTIVA E DE REFLUXO)
- [x] `5` ALERGIA – RINITE
- [x] `6` DOR DE GARGANTA
- [x] `7` RONCO
- [x] `8` INFLAMAÇÃO
- [x] `9` AZIA (QUEIMAÇÃO / PIROSE)
- [x] `10` REFLUXO GASTROESOFÁGICO (DRGE)
- [x] `11` GASTRITE (INFLAMAÇÃO DA MUCOSA GÁSTRICA)
- [x] `12` CÓLICA INTESTINAL
- [x] `13` CONSTIPAÇÃO INTESTINAL (INTESTINO PRESO)
- [x] `14` HEMORROIDA
- [x] `15` DOR DE CABEÇA ENXAQUECA, SINUSITE E CEFALEIA TENSIONAL
- [x] `16` SARNA (ESCABIOSE)
- [x] `17` PIOLHOS E LÊNDIAS (PEDICULOSE)
- [x] `18` PSORÍASE
- [x] `19` IMPINGEM / MICOSE / TÍNEA CORPORIS
- [x] `20` TÍNEA CRURAL – MICOSE NA VIRILHA (TINEA CRURIS)
- [x] `21` ONICOMICOSE – MICOSE NA UNHA
- [x] `22` FRIEIRA / PÉ DE ATLETA (TÍNEA PEDIS)
- [x] `23` PITIRÍASE VERSICOLOR (PANO BRANCO)
- [x] `24` FOLICULITE
- [x] `25` FURÚNCULO
- [x] `26` CROSTA LÁCTEA (Dermatite Seborreica do Lactente)
- [x] `27` QUEIMADURA (1º e 2º GRAU)
- [x] `28` CÓLICA MENSTRUAL (Dismenorreia)
- [x] `29` CISTITE
- [x] `30` CANDIDÍASE ÍNTIMA NA MULHER (VULVOVAGINITE POR CANDIDA)
- [x] `31` VAGINOSE BACTERIANA (GARDNERELLA VAGINALIS)
- [x] `32` Cândida no Homem
- [x] `33` OLHO SECO
- [x] `34` CONJUNTIVITE
- [x] `35` TERÇOL (HORDÉOLO)
- [x] `36` INFECÇÃO
- [x] `37` FEBRE
- [x] `38` DOR
- [x] `39` DIARREIA
- [x] `40` DOR NO OUVIDO (OTALGIA)
- [x] `41` asma
- [x] `42` picada de abelha
- [x] `44` dor de dente
- [x] `46` Dor no corpo / mialgia
- [x] `47` Aftas e úlceras na boca
- [x] `48` Picadas de insetos
- [x] `49` melasma
- [x] `50` dor pé da barriga
- [x] `51` alergia
- [x] `52` Alergia na pele
- [x] `53` sonambulismo
- [x] `54` desmaio com pernas roxas
- [x] `55` pedra na vesícula
- [x] `56` INFLAMAÇÃO DA MUCOSA GÁSTRICA
- [x] `57` sintomas gripais
- [x] `58` dor abdominal
- [x] `59` fraqueza e tremor
- [x] `60` dor no braço após queda
- [x] `61` ganho de peso na amamentação
- [x] `62` perda de peso
- [x] `63` granuloma
- [x] `64` formula diuretica
- [x] `65` retenção de líquido
- [x] `69` oxiúros
- [x] `70` criança sem urinar a 24 horas
- [x] `71` náuseas e pressão baixa
- [x] `72` [Cliente grávida e com cólica]
- [x] `73` problema no bumbum
- [x] `74` sudorese, fraqueza, dor de cabeça, câimbra
- [x] `75` suplemento para paciente oncológico
- [x] `76` mordida de gato não vacinado
- [x] `77` dor nos rins
- [x] `83` suplementos para diabeticos
- [x] `86` cortar o leite materno
- [x] `87` soltar cera do ouvido
- [x] `88` labirintite
- [x] `89` herpes zoster
- [x] `90` Gordura no fígado
- [x] `93` menopausa
- [x] `100` LOMBALGIA (DOR NAS COSTAS)

## Novas (gaps identificados vs. top 50 de farmácia, adicionadas em 2026-08-12)

- [x] `107` Gripe e resfriado comum
- [x] `108` Bronquite / falta de ar leve
- [x] `109` Enjoo / náusea isolada
- [x] `110` Gases / flatulência
- [x] `111` Intoxicação alimentar leve
- [x] `112` Acne
- [x] `113` Caspa / dermatite seborreica
- [x] `114` Queda de cabelo
- [x] `115` Insônia / ansiedade leve

## Novas (gaps vs. protocolos CFF de problemas autolimitados, adicionadas em 2026-08-12)

- [x] `116` Ressaca
- [x] `117` Herpes labial
- [x] `118` Assadura de fralda
- [x] `119` TPM (tensão pré-menstrual)
- [x] `120` Vômito
- [x] `121` Chulé / suor excessivo nos pés
- [x] `122` Verruga
- [x] `123` Calo e calosidade nos pés
- [x] `124` Unha encravada
- [x] `125` Sapinho (candidíase oral em bebê)
- [x] `126` Mau hálito (halitose)
- [x] `127` Cólica renal / pedra nos rins

## Novas (crônicos, saúde do homem, infantil, ORL, pele, viagem/sol, feminino — 2026-08-12)

- [x] `128` Hipertensão arterial (controle/orientação)
- [x] `129` Diabetes (controle/orientação)
- [x] `130` Colesterol alto
- [x] `131` Disfunção erétil
- [x] `132` Dificuldade urinária masculina (próstata aumentada)
- [x] `133` Cólica do lactente
- [x] `134` Tontura / vertigem
- [x] `135` Rouquidão / laringite
- [x] `136` Amigdalite
- [x] `137` Prurido generalizado
- [x] `138` Micose no couro cabeludo
- [x] `139` Rachadura no calcanhar
- [x] `140` Enjoo de viagem (cinetose)
- [x] `141` Queimadura solar / insolação
- [x] `142` Corrimento vaginal
