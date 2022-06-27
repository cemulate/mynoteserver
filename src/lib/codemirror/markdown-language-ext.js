// https://discuss.codemirror.net/t/markdown-and-latex-syntax-highlighting/4382/11
// https://github.com/personalizedrefrigerator/joplin/blob/pr/markdownToolbar/packages/app-mobile/components/NoteEditor/MarkdownTeXParser.ts
import { tags, Tag } from '@lezer/highlight';
import { HighlightStyle } from '@codemirror/language';
import { markdownLanguage } from '@codemirror/lang-markdown';

const DOLLAR_SIGN_CHAR_CODE = 36;
const MATH_BLOCK_START_REGEX = /^\$\$/;
const MATH_BLOCK_STOP_REGEX = /^.*\$\$\s*$/;

const InlineMathDelim = { resolve: 'InlineMath', mark: 'InlineMathDelim' };

const markdownTexTags = { inlineMath: Tag.define(), blockMath: Tag.define() };

const InlineMathConfig = {
    defineNodes: [
        {
            name: 'InlineMath',
            style: markdownTexTags.inlineMath,
        },
        {
            name: 'InlineMathDelim',
            style: tags.processingInstruction,
        },
    ],
    parseInline: [{
        name: 'InlineMath',
        after: 'InlineCode',

        parse(cx, next, pos) {
            const prevCharCode = pos - 1 >= 0 ? cx.char(pos - 1) : -1;
            const nextCharCode = cx.char(pos + 1);
            if (next != DOLLAR_SIGN_CHAR_CODE
                    || prevCharCode == DOLLAR_SIGN_CHAR_CODE
                    || nextCharCode == DOLLAR_SIGN_CHAR_CODE) {
                return -1;
            }

            // $ delimiters are both opening and closing delimiters
            const isOpen = true;
            const isClose = true;
            cx.addDelimiter(InlineMathDelim, pos, pos + 1, isOpen, isClose);
            return pos + 1;
        },
    }],
};

const BlockMathConfig = {
    defineNodes: [
        {
            name: 'BlockMath',
            style: markdownTexTags.blockMath,
        },
    ],
    parseBlock: [{
        name: 'BlockMath',
        before: 'FencedCode',
        parse(cx, line) {
            const delimLength = 2;
            const start = cx.lineStart;

            // $$ delimiter? Start math!
            if (MATH_BLOCK_START_REGEX.exec(line.text)) {
                // If the math region ends immediately (on the same line),
                if (MATH_BLOCK_STOP_REGEX.exec(line.text.substring(delimLength))) {
                    const elem = cx.elt('BlockMath', cx.lineStart, cx.lineStart + line.text.length);
                    cx.addElement(elem);
                } else {
                    let hadNextLine = false;
                    // Otherwise, it's a multi-line block display.
                    // Consume lines until we reach the end.
                    do {
                        hadNextLine = cx.nextLine();
                    }
                    while (hadNextLine && !MATH_BLOCK_STOP_REGEX.exec(line.text));

                    let stop;

                    // Only include the ending delimiter if it exists
                    if (hadNextLine) {
                        stop = cx.lineStart + delimLength;
                    } else {
                        stop = cx.lineStart;
                    }

                    // Mark all lines in the block as math.
                    const elem = cx.elt('BlockMath', start, stop);
                    cx.addElement(elem);
                }

                // Don't re-process the ending delimiter (it may look the same
                // as the starting delimiter).
                cx.nextLine();

                return true;
            }

            return false;
        },
        // End paragraph-like blocks
        endLeaf(_cx, line, _leaf) {
            // Leaf blocks (e.g. block quotes) end early if math starts.
            return MATH_BLOCK_START_REGEX.exec(line.text) != null;
        },
    }],
};

const markdownTexHighlightStyle = HighlightStyle.define([
    { tag: markdownTexTags.inlineMath, color: '#4876d6' },
    { tag: markdownTexTags.blockMath, color: '#4876d6' },
]);

const markdownBrackets = markdownLanguage.data.of({
    closeBrackets: {
        brackets: [ '(', '[', '{', '$', '`' ],
    },
});

export { InlineMathConfig, BlockMathConfig, markdownTexTags, markdownTexHighlightStyle, markdownBrackets };