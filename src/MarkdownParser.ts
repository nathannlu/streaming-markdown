const blogpostMarkdown = `# control

hi

*humans should focus on bigger problems*

## Setup

## Folder structure

**The most important folders are:**

1. \`folder1\`: This is folder 1.
2. \`folder2\`: This is folder 2.
3. \`folder3\`: This is folder 3.

Some less important folders:

1. \`folder4\`: This is folder 4.
2. \`folder5\`: This is folder 5.
3. \`folder6\`: 6.

## Miscellaneous things that may or may not be useful

##### Where to find other definitions

They are in a file called \`other_def.py\`. It might not be clear where that file is. Run \`rg --files --no-ignore bazel-out | rg other_def.py\` to find the file.

\`\`\`bash
git clone git@github.com:REPO
\`\`\`

\`\`\`bash
./init.sh
\`\`\`

## Releasing

Within \`vscode/\`:

- Bump the version
- Then:

\`\`\`
git checkout build
git merge main
git push origin build
\`\`\`

- Wait for 14 minutes for gulp and ~30 minutes for build
- Go to example.com, test the build locally and hit release
`;

let currentContainer: HTMLElement | null = null;
// Do not edit this method
function runStream() {
    currentContainer = document.getElementById('markdownContainer')!;
    
    // this randomly split the markdown into tokens between 2 and 20 characters long
    // simulates the behavior of an ml model thats giving you weirdly chunked tokens
    const tokens: string[] = [];
    let remainingMarkdown = blogpostMarkdown;
    while (remainingMarkdown.length > 0) {
        const tokenLength = Math.floor(Math.random() * 18) + 2;
        const token = remainingMarkdown.slice(0, tokenLength);
        tokens.push(token);
        remainingMarkdown = remainingMarkdown.slice(tokenLength);
    }

  
    const toCancel = setInterval(() => {
        const token = tokens.shift();

        if (token) {
            addToken(token);
        } else {
            clearInterval(toCancel);
        }

        if (tokens.length === 0) {
          takeFinalStep()
        }
    }, 20);
}

// dont be afraid of using globals for state

/*YOUR CODE HERE
this does token streaming with no styling right now
your job is to write the parsing logic to make the styling work
 */





// append style tag for `code` to the head
const style = document.createElement('style');
style.innerHTML = `
  code {
    background-color: lightgrey;
    font-family: 'Courier New', Courier, monospace;
    border-radius: 5px;
  }
`;
document.head.appendChild(style);


// Handles writing whichever 
// state to the dom
class DomTreeWriter {
  isOn: boolean = false;
  private element: HTMLElement | null = null;
  private _type: string;
  private typeToElementMap = {
    "```": "code",
    "`": "code",
    "**": "b",
    "*": "i",
    "h1": "h1",
    "h2": "h2",
    "h3": "h3",
    "h4": "h4",
    "h5": "h5",
    "h6": "h6",
  };

  get currentElement() {
    return this.element;
  }

  get type() {
    return this._type;
  }

  private _toggleOn(typ) {
    const el = document.createElement(this.typeToElementMap[typ]);

    this.isOn = true;
    this._type = typ;
    this.element = el
    currentContainer.appendChild(el);
  }

  private _toggleOff() {
    this.isOn = false;
    this.element = null;
  }

  toggle(typ) {
    if (!this.typeToElementMap[typ]) {
      throw new Error(`Invalid type ${typ}`);
    }

    if (this.isOn && this._type === typ) {
      this._toggleOff();
    } else {
      this._toggleOn(typ);
    }
  }

  reset() {
    this._toggleOff();
  }
}


// responsible for maintaining cursor position
// of where we are in the text stream
class Tokenizer {
  private stream: string = "";
  private cursor: number = 0;
  private LOOKAHEAD = 6;

  eatToken() {
    this.cursor++;
  }

  eatTwoTokens() {
    this.cursor+=2;
  }

  eatNTokens(n: number) {
    this.cursor+=n;
  }

  lookahead_n(n) {
    return this.stream[this.cursor + n];
  }

  // append a raw chunk of text to the stream
  appendRawChunk(chunk: string) {
    this.stream += chunk;
  }

  get currentToken() {
    return this.stream[this.cursor];
  }

  get lookahead_1() {
    return this.stream[this.cursor + 1];
  }

  get lookahead_2() {
    return this.stream[this.cursor + 2];
  }

  get canLookahead() {
    return this.cursor < this.stream.length - this.LOOKAHEAD;
  }
}


/**
 * PARSER
 * ---
 *
 * lets imagine we stream the text ```hello world```. 
 * the cursor is initialized to the first character of the string.
 * it will see the first character is a markdown character, so it will
 * perform a lookahead to see if the next two characters are also markdown characters.
 * this part is handled by the Tokenizer class.
 *
 *
 * | ` | ` | ` | h | e | l | ...
 *   ^       ^
 *   p1      p2
 *
 * p1 = cursor
 * p2 = lookahead
 *
 * in this case it is, so it will consume the next two characters and toggle the state
 * the global state will be set to `code`, p1 (the cursor) will move to after the 
 * consumed characters (in this case, h) and every character after will be written to the
 * `code` element until the next three backticks are encountered.
 * the global state is handled by the DomTreeWriter class.
 */

class Parser {
  tokenizer: Tokenizer;
  private domTreeWriter: DomTreeWriter;

  constructor() {
    this.tokenizer = new Tokenizer();
    this.domTreeWriter = new DomTreeWriter();
  }

  // this function will parse between 1 - 6 characters
  // depending on the current state.
  //
  // e.g. if it detects an h6 heading, it will eat 6 #'s
  parseOneStep() {
    const char = this.tokenizer.currentToken;
    const lookahead_1 = this.tokenizer.lookahead_1;
    const lookahead_2 = this.tokenizer.lookahead_2;

    // handle special markdown characters
    if (char === "#") {
      const headingMap = ["h1", "h2", "h3", "h4", "h5", "h6"];

      // run a while loop and count 
      // the number of hashtags
      let hashCount = 0;
      while (this.tokenizer.lookahead_n(hashCount) === "#") {
        hashCount++;
      }

      this.tokenizer.eatNTokens(hashCount);
      this.domTreeWriter.toggle(headingMap[hashCount - 1]);
    }
    else if(char === "`" && lookahead_1 === "`" && lookahead_2 === "`") {
      // here, we know the current token is a `
      // and the next two tokens are also `
      // consume the next two ``
      this.tokenizer.eatTwoTokens();
      this.domTreeWriter.toggle("```");
    }
    else if(char === "`") {
      this.domTreeWriter.toggle("`");
    }
    else if (char === "*" && lookahead_1 === "*") {
      // here we know the next token is a *
      this.tokenizer.eatToken();
      this.domTreeWriter.toggle("**");
    } 
    else if (char === "*") {
      this.domTreeWriter.toggle("*");
    }

    // handle states
    else if (this.domTreeWriter.isOn) {
      // handle special case for headings.
      // headings end when a newline is encountered
      const isHeading = this.domTreeWriter.type.includes("h")
      if (char === "\n" && isHeading) {
        this.domTreeWriter.reset();
      } else {
        this._writeNormal(this.domTreeWriter.currentElement!, char);
      }
    } 

    // handle every other type of text
    // this (\n and " " edge cases) need to be at the bottom
    // of the if statement otherwise the state handler won't run
    else {
      this._writeNormal(currentContainer, char);
    }

    // move the cursor to the next token
    this.tokenizer.eatToken();
  }

  // for some reason, inner html doesnt recognize \n
  // and spaces, so we need to handle them separately
  private _writeNormal(dom, char) {
    if (char === "\n") {
      dom.appendChild(document.createElement('br'));
    }
    else if (char === " ") {
      dom.innerHTML += "&nbsp;";
    }
    else {
      dom.innerHTML += char;
    }
  }

}

const parser = new Parser();

function addToken(token: string) {
  if(!currentContainer) return;

  parser.tokenizer.appendRawChunk(token);

  while(parser.tokenizer.canLookahead) {
    parser.parseOneStep();
  }
}

function takeFinalStep() {
  console.log('Taking final step');
  parser.parseOneStep();
}

