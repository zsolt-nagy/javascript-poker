const newGameButton = document.querySelector(".js-new-game-button");
const newHandButton = document.querySelector(".js-new-hand-button");
const potContainer = document.querySelector(".js-pot-container");

const playerCardsContainer = document.querySelector(".js-player-cards-container");
const playerChipContainer = document.querySelector(".js-player-chip-container");
const playerStatusContainer = document.querySelector(".js-player-status-container");
const betArea = document.querySelector(".js-bet-area");
const betSlider = document.querySelector("#bet-amount");
const betSliderValue = document.querySelector(".js-slider-value");
const betButton = document.querySelector(".js-bet-button");
const betPotButton = document.querySelector(".js-betpot");
const bet25Button = document.querySelector(".js-bet25");
const bet50Button = document.querySelector(".js-bet50");

const computerCardsContainer = document.querySelector(".js-computer-cards-container");
const computerChipContainer = document.querySelector(".js-computer-chip-container");
const computerStatusContainer = document.querySelector(".js-computer-status-container");
const computerActionContainer = document.querySelector(".js-computer-action");

const communityCardsContainer = document.querySelector(".js-community-cards");

// program state
let {
    deckId,
    playerCards, // játékos lapjai
    computerCards, // számítógép lapjai
    communityCards, // közös lapok
    computerAction, // játékos cselekedete (call, fold)
    playerChips, // játékos zsetonjai
    playerBets, // játékos licitje ebben a licitkörben
    playerStatus, // játékos státuszinformációja (győzött, vesztett, döntetlen, bedobta)
    computerChips, // gép zsetonjai
    computerBets, // számítógép licitje ebben a licitkörben
    computerStatus, // számítógép státuszinformációja
    playerBetPlaced, // játékos már licitált
    timeoutIds, // setTimeout ID lista
} = getInitialState();

function getPot() {
    return playerBets + computerBets;
}

function getInitialState() {
    return {
        deckId: null,
        playerCards: [],
        computerCards: [],
        communityCards: [],
        computerAction: null,
        playerChips: 100,
        playerBets: 0,
        playerStatus: "",
        computerChips: 100,
        computerBets: 0,
        computerStatus: "",
        playerBetPlaced: false,
        timeoutIds: [],
    };
}

// Állapotmenedzsment TODO: új leosztás indításánál ezeket az értékeket érdemes
// frissíteni
// deckId = null;
// playerBets = 0;
// computerBets = 0;
// playerCards = [];
// computerCards = [];
// computerAction = null;
// playerBetPlaced = false;
// playerStatus = "";
// computerStatus = "";
// computerAction = "";
// Gyakorlatilag mindent resetelünk, kivéve a zsetonállást.

function initializeGame() {
    ({ playerChips, computerChips } = getInitialState());
    initializeHand();
}

function initializeHand() {
    for (let id of timeoutIds) {
        clearTimeout(id);
    }
    // A bet slider állapota csak a DOM-ban van rögzítve. Hozzuk alapértelmezésbe.
    betSlider.value = 1;
    // Feltételezzük, hogy később az alapértelmezett értékeket máshol renderelni
    // fogjuk, ezért a slider értékét itt nem kell renderelnünk.
    ({
        deckId,
        playerCards,
        computerCards,
        communityCards,
        computerAction,
        playerBets,
        playerStatus,
        computerBets,
        computerStatus,
        playerBetPlaced,
        timeoutIds,
    } = getInitialState());
}

function canBet() {
    return playerCards.length === 2 && playerChips > 0 && playerBetPlaced === false;
}

function renderSlider() {
    if (canBet()) {
        betArea.classList.remove("invisible");
        betSlider.setAttribute("max", playerChips);
        betSliderValue.innerText = betSlider.value;
    } else {
        betArea.classList.add("invisible");
    }
}

function renderCardsInContainer(cards, container) {
    let html = "";

    for (let card of cards) {
        html += `<img src="${card.image}" alt="${card.code}" class="card-image" />`;
    }
    container.innerHTML = html;
}

function renderAllCards() {
    renderCardsInContainer(playerCards, playerCardsContainer);
    renderCardsInContainer(computerCards, computerCardsContainer);
    renderCardsInContainer(communityCards, communityCardsContainer);
}

function renderChips() {
    playerChipContainer.innerHTML = `
        <div class="chip-count">Játékos: ${playerChips} zseton</div>
    `;
    computerChipContainer.innerHTML = `
        <div class="chip-count">Számítógép: ${computerChips} zseton</div>
    `;
}

function renderPot() {
    potContainer.innerHTML = `
    <div class="chip-count">Pot: ${getPot()}</div>
    `;
}

function renderActions() {
    computerActionContainer.innerHTML = computerAction ?? "";
}

function renderStatusInfo() {
    playerStatusContainer.innerHTML = playerStatus;
    computerStatusContainer.innerHTML = computerStatus;
}

function render() {
    renderAllCards();
    renderChips();
    renderPot();
    renderSlider();
    renderActions();
    renderStatusInfo();
}

async function drawPlayerCards() {
    if (deckId == null) return;
    const data = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=2`);
    const response = await data.json();
    playerCards = response.cards;
}

function postBlinds() {
    if (computerChips === 1) {
        computerChips = 0;
        computerBets = 1;
    } else {
        computerChips -= 2;
        computerBets += 2;
    }
    playerChips -= 1;
    playerBets += 1;
    render();
}

// Egy leosztás indítása
async function startHand() {
    document.querySelector(".js-new-hand-button").setAttribute("disabled", true);
    // hand = leosztás
    postBlinds(); // vaktétek adminisztrálása
    const data = await fetch("https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1");
    const response = await data.json();
    deckId = response.deck_id;
    await drawPlayerCards();
    render();
}

// Egy játék egy vagy több leosztásból áll.
function startGame() {
    initializeGame();
    startHand();
}

function newHand() {
    initializeHand();
    startHand();
}

function endHand(winner = null) {
    const id = setTimeout(() => {
        if (computerAction === ACTIONS.Fold || winner === STATUS.Player) {
            playerChips += getPot();
        } else if (winner === STATUS.Computer) {
            computerChips += getPot();
        } /* if (winner === STATUS.Draw) */ else {
            playerChips += playerBets;
            computerChips += computerBets;
        } // nincs más lehetőség
        playerBets = 0;
        computerBets = 0;
        render();
        if (computerChips > 0 && playerChips > 0) {
            document.querySelector(".js-new-hand-button").removeAttribute("disabled");
        }
    }, 2000);
    timeoutIds.push(id);
}

function shouldComputerCall(computerCards) {
    if (computerCards.length !== 2) return false; // extra védelem
    debugger;
    if (computerChips === 0) return true; // számítógép all in van

    const card1Code = computerCards[0].code; // pl. AC, 4H, 9D, 0H (10: 0)
    const card2Code = computerCards[1].code;
    const card1Value = card1Code[0];
    const card2Value = card2Code[0];
    const card1Suit = card1Code[1];
    const card2Suit = card2Code[1];

    return (
        card1Value === card2Value ||
        ["0", "J", "Q", "K", "A"].includes(card1Value) ||
        ["0", "J", "Q", "K", "A"].includes(card2Value) ||
        (card1Suit === card2Suit && Math.abs(Number(card1Value) - Number(card2Value)) <= 2)
    );
}

const SHOWDOWN_API_PREFIX = "https://api.pokerapi.dev/v1/winner/texas_holdem";
function cardsToString(cards) {
    return cards.map((x) => (x.code[0] === "0" ? "1" + x.code : x.code)).toString();
}
async function getWinner() {
    // https://api.pokerapi.dev/v1/winner/texas_holdem?cc=AC,KD,QH,JS,7C&pc[]=10S,8C&pc[]=3S,2C&pc[]=QS,JH
    const cc = cardsToString(communityCards);
    const pc0 = cardsToString(playerCards);
    const pc1 = cardsToString(computerCards);
    const data = await fetch(`${SHOWDOWN_API_PREFIX}?cc=${cc}&pc[]=${pc0}&pc[]=${pc1}`);
    const response = await data.json();
    const winners = response.winners;
    if (winners.length === 2) {
        return STATUS.Draw;
    } else if (winners[0].cards === pc0) {
        // Játékos nyert
        return STATUS.Player;
    } else {
        return STATUS.Computer;
    }
}

async function showdown() {
    const data = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=5`);
    const response = await data.json();
    communityCards = response.cards;
    render();
    const winner = await getWinner();
    return winner;
}

function returnExtraBetsFromPot() {
    if (playerBets > computerChips + computerBets) {
        let chipsToReturnToPlayer = playerBets - computerChips - computerBets;
        playerBets -= chipsToReturnToPlayer;
        playerChips += chipsToReturnToPlayer;
    }
}

async function computerMoveAfterBet() {
    const data = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=2`);
    const response = await data.json();

    // A játékos csak egészített VAGY a számítógépnek nincs licitálásra felhasználható zsetonja
    if (playerBets === 2 || computerChips === 0) {
        computerAction = ACTIONS.Check;
    } else if (shouldComputerCall(response.cards)) {
        computerAction = ACTIONS.Call;
    } else {
        computerAction = ACTIONS.Fold;
    }

    if (computerAction === ACTIONS.Check || computerAction === ACTIONS.Call) {
        returnExtraBetsFromPot();
    }
    if (computerAction === ACTIONS.Call) {
        // játékos: Bet (vaktétek és játékos licit)
        // számítógép: 2
        // kassza: Pot
        // Bet + 2 = Pot
        // 2 zsetont már betett a számítógép vaktétként, így Bet - 2-t
        // kell megadnia.
        // Bet - 2 = Pot - 4
        const difference = playerBets - computerBets;
        computerChips -= difference;
        computerBets += difference;
    }

    if (computerAction === ACTIONS.Check || computerAction == ACTIONS.Call) {
        computerCards = response.cards;
        render();
        const winner = await showdown();
        if (winner === STATUS.Player) {
            playerStatus = STATUS.Player;
        } else if (winner === STATUS.Computer) {
            computerStatus = STATUS.Computer;
        } else if (winner === STATUS.Draw) {
            playerStatus = STATUS.Draw;
            computerStatus = STATUS.Draw;
        }
        endHand(winner);
    } else {
        // Computer Folded
        playerStatus = STATUS.Player;
        render();
        endHand();
    }
}

function bet() {
    const betValue = Number(betSlider.value);
    // játékos zsetonjaiból kivonjuk a bet méretét
    playerChips -= betValue;
    // játék állapota: játékos megtette a tétjét
    playerBetPlaced = true;
    playerBets += betValue;
    // újrarenderelünk
    render();
    // ellenfél reakciója
    computerMoveAfterBet();
}

function getPlayerPotBet() {
    let difference = computerBets - playerBets;
    return Math.min(playerChips, getPot() + 2 * difference);
}

function setSliderValue(percentage) {
    let betSize = null;
    if (typeof percentage === "number") {
        betSize = Math.floor((playerChips * percentage) / 100);
    } else {
        betSize = getPlayerPotBet();
    }

    betSlider.value = betSize;
    render();
}

newGameButton.addEventListener("click", startGame);
newHandButton.addEventListener("click", newHand);

betSlider.addEventListener("change", render);
betSlider.addEventListener("input", render);
betPotButton.addEventListener("click", () => setSliderValue());
bet25Button.addEventListener("click", () => setSliderValue(25));
bet50Button.addEventListener("click", () => setSliderValue(50));

betButton.addEventListener("click", bet);
initializeGame();
render();
