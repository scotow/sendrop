const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CHARACTERS_LENGTH = CHARACTERS.length;

const WORDS = ['able', 'about', 'above', 'accept', 'act', 'add', 'after', 'again', 'against', 'age', 'ago', 'air', 'all', 'allow', 'also', 'always', 'am', 'among', 'an', 'and', 'animal', 'answer', 'any', 'appear', 'are', 'area', 'as', 'at', 'back', 'base', 'be', 'beauty', 'bed', 'been', 'before', 'began', 'behind', 'believe', 'best', 'better', 'between', 'big', 'bird', 'black', 'blue', 'boat', 'body', 'book', 'borrow', 'both', 'box', 'boy', 'break', 'brought', 'build', 'busy', 'but', 'buy', 'by', 'call', 'came', 'cancel', 'car', 'care', 'carry', 'cause', 'center', 'certain', 'check', 'children', 'city', 'class', 'clean', 'clear', 'cold', 'color', 'comb', 'come', 'common', 'complain', 'complete', 'contain', 'correct', 'cough', 'could', 'count', 'country', 'course', 'cover', 'cross', 'cry', 'dance', 'dark', 'day', 'decide', 'deep', 'develop', 'did', 'differ', 'direct', 'does', 'dog', 'done', 'dont', 'door', 'down', 'drink', 'dry', 'during', 'each', 'early', 'earth', 'ease', 'east', 'end', 'enough', 'even', 'ever', 'every', 'example', 'explain', 'eye', 'face', 'fact', 'family', 'far', 'farm', 'fast', 'father', 'feel', 'feet', 'few', 'field', 'figure', 'final', 'fine', 'finish', 'fire', 'first', 'fish', 'fit', 'five', 'fix', 'follow', 'food', 'foot', 'for', 'force', 'forget', 'form', 'found', 'four', 'free', 'friend', 'from', 'front', 'full', 'game', 'gave', 'get', 'girl', 'gold', 'good', 'got', 'govern', 'great', 'green', 'ground', 'group', 'grow', 'had', 'half', 'hand', 'happen', 'hard', 'has', 'he', 'head', 'heard', 'heat', 'help', 'her', 'here', 'high', 'him', 'his', 'hold', 'home', 'horse', 'hot', 'hour', 'house', 'how', 'hundred', 'hurt', 'idea', 'if', 'in', 'inch', 'interest', 'is', 'island', 'it', 'just', 'keep', 'kind', 'king', 'knew', 'land', 'language', 'large', 'last', 'late', 'laugh', 'lay', 'lead', 'left', 'less', 'let', 'letter', 'life', 'light', 'like', 'line', 'list', 'little', 'long', 'lose', 'lot', 'love', 'low', 'machine', 'made', 'main', 'man', 'many', 'map', 'mark', 'may', 'me', 'mean', 'measure', 'men', 'might', 'mile', 'mind', 'minute', 'miss', 'money', 'moon', 'more', 'morning', 'most', 'mother', 'mountain', 'move', 'much', 'music', 'must', 'my', 'name', 'near', 'never', 'new', 'next', 'night', 'no', 'north', 'note', 'nothing', 'notice', 'noun', 'now', 'number', 'numeral', 'object', 'of', 'off', 'often', 'oh', 'old', 'on', 'once', 'one', 'only', 'or', 'order', 'organise', 'other', 'our', 'out', 'over', 'own', 'page', 'paper', 'part', 'pass', 'pattern', 'pay', 'people', 'perhaps', 'person', 'picture', 'piece', 'place', 'plain', 'plan', 'plane', 'plant', 'point', 'port', 'pose', 'possible', 'pound', 'power', 'press', 'problem', 'produce', 'product', 'pull', 'question', 'quick', 'ran', 'rank', 'reach', 'ready', 'real', 'record', 'red', 'remember', 'reply', 'rest', 'right', 'river', 'road', 'rock', 'room', 'round', 'rule', 'said', 'same', 'saw', 'school', 'science', 'sea', 'second', 'seem', 'self', 'sell', 'send', 'sentence', 'serve', 'set', 'several', 'shape', 'she', 'ship', 'short', 'should', 'show', 'shut', 'side', 'sign', 'simple', 'since', 'six', 'size', 'slow', 'small', 'smoke', 'snow', 'so', 'some', 'song', 'soon', 'sound', 'south', 'speak', 'special', 'spend', 'star', 'state', 'stay', 'step', 'still', 'stood', 'stop', 'story', 'street', 'strong', 'succeed', 'such', 'sun', 'sure', 'surface', 'swim', 'table', 'tail', 'ten', 'test', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'thing', 'this', 'those', 'though', 'thought', 'thousand', 'three', 'through', 'time', 'to', 'together', 'told', 'too', 'took', 'top', 'toward', 'town', 'translate', 'tree', 'true', 'turn', 'two', 'type', 'under', 'understand', 'unit', 'until', 'up', 'us', 'use', 'usual', 'very', 'voice', 'vowel', 'wait', 'wake', 'walk', 'want', 'war', 'warm', 'was', 'watch', 'water', 'way', 'we', 'week', 'weight', 'well', 'went', 'were', 'west', 'what', 'wheel', 'when', 'where', 'which', 'while', 'white', 'who', 'whole', 'why', 'will', 'wind', 'with', 'wonder', 'wood', 'word', 'world', 'worry', 'would', 'year', 'yes', 'yet', 'you', 'young', 'your', 'ask', 'begin', 'bring', 'can', 'change', 'close', 'cut', 'do', 'draw', 'drive', 'eat', 'fall', 'fill', 'find', 'fly', 'give', 'go', 'have', 'hear', 'know', 'learn', 'leave', 'listen', 'live', 'look', 'make', 'need', 'open', 'play', 'put', 'rain', 'read', 'run', 'say', 'see', 'sing', 'sit', 'sleep', 'spell', 'stand', 'start', 'study', 'take', 'talk', 'teach', 'tell', 'think', 'travel', 'try', 'work', 'write'];
const WORDS_LENGTH = WORDS.length;

const SHORT_ALIAS_LENGTH = 6;
const LONG_ALIAS_LENGTH = 3;
const REVOKE_TOKEN_LENGTH = 15;

function charToken(length) {
    function randomCharacter() {
        return CHARACTERS[Math.floor(Math.random() * CHARACTERS_LENGTH)];
    }

    let alias = '';
    for(let i = 0; i < SHORT_ALIAS_LENGTH; i++) {
        alias += randomCharacter();
    }

    return alias;
}


function wordToken(length) {
    function randomWord() {
        return WORDS[Math.floor(Math.random() * WORDS_LENGTH)];
    }

    const aliasArray = [];
    for(let i = 0; i < LONG_ALIAS_LENGTH; i++) {
        aliasArray.push(randomWord());
    }

    return aliasArray.join('-');
}

exports.short_alias = charToken.bind(null, SHORT_ALIAS_LENGTH);
exports.long_alias = wordToken.bind(null, LONG_ALIAS_LENGTH);
exports.revoke_token = charToken.bind(null, REVOKE_TOKEN_LENGTH);
