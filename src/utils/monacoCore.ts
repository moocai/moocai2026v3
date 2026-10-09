// Entrada personalitzada de Monaco: inclou l'API de l'editor i totes les
// contribucions (find, suggest, hover, diff, format...) però NOMÉS els
// llenguatges que fem servir (Python, i el resaltat de TypeScript/JSX).
// El servei de llenguatge de TypeScript (IntelliSense + worker) és molt gran i
// només el necessiten els cursos de React: viu a `monacoTypescript.ts` i es
// carrega a part (`loadMonacoTypescript`).
// Això redueix molt la mida del bundle respecte d'importar `monaco-editor`
// sencer, que registra ~90 llenguatges.
import * as editorApi from 'monaco-editor/editor/editor.api';

// --- Contribucions de l'editor (les mateixes que `editor.main`) ---
import 'monaco-editor/editor/contrib/anchorSelect/browser/anchorSelect';
import 'monaco-editor/editor/contrib/bracketMatching/browser/bracketMatching';
import 'monaco-editor/editor/contrib/caretOperations/browser/transpose';
import 'monaco-editor/editor/contrib/clipboard/browser/clipboard';
import 'monaco-editor/editor/contrib/codeAction/browser/codeActionContributions';
import 'monaco-editor/editor/browser/widget/codeEditor/codeEditorWidget';
import 'monaco-editor/editor/contrib/codelens/browser/codelensController';
import '../../node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.css';
import 'monaco-editor/editor/contrib/colorPicker/browser/colorPickerContribution';
import 'monaco-editor/editor/contrib/comment/browser/comment';
import 'monaco-editor/editor/contrib/contextmenu/browser/contextmenu';
import 'monaco-editor/editor/contrib/cursorUndo/browser/cursorUndo';
import 'monaco-editor/editor/browser/widget/diffEditor/diffEditor.contribution';
import 'monaco-editor/editor/contrib/diffEditorBreadcrumbs/browser/contribution';
import 'monaco-editor/editor/contrib/dnd/browser/dnd';
import 'monaco-editor/editor/contrib/documentSymbols/browser/documentSymbols';
import 'monaco-editor/editor/contrib/dropOrPasteInto/browser/dropIntoEditorContribution';
import 'monaco-editor/features/find/register';
import 'monaco-editor/editor/contrib/floatingMenu/browser/floatingMenu.contribution';
import 'monaco-editor/editor/contrib/folding/browser/folding';
import 'monaco-editor/editor/contrib/fontZoom/browser/fontZoom';
import 'monaco-editor/editor/contrib/format/browser/formatActions';
import 'monaco-editor/editor/contrib/gotoError/browser/gotoError';
import 'monaco-editor/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess';
import 'monaco-editor/editor/contrib/gotoSymbol/browser/link/goToDefinitionAtPosition';
import 'monaco-editor/editor/contrib/gpu/browser/gpuActions';
import 'monaco-editor/editor/contrib/hover/browser/hoverContribution';
import 'monaco-editor/editor/contrib/indentation/browser/indentation';
import 'monaco-editor/editor/contrib/inlayHints/browser/inlayHintsContribution';
import 'monaco-editor/editor/contrib/inlineCompletions/browser/inlineCompletions.contribution';
import 'monaco-editor/editor/contrib/inlineProgress/browser/inlineProgress';
import 'monaco-editor/editor/contrib/inPlaceReplace/browser/inPlaceReplace';
import 'monaco-editor/editor/contrib/insertFinalNewLine/browser/insertFinalNewLine';
import 'monaco-editor/editor/standalone/browser/inspectTokens/inspectTokens';
import 'monaco-editor/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard';
import 'monaco-editor/editor/contrib/lineSelection/browser/lineSelection';
import 'monaco-editor/editor/contrib/linesOperations/browser/linesOperations';
import 'monaco-editor/editor/contrib/linkedEditing/browser/linkedEditing';
import 'monaco-editor/editor/contrib/links/browser/links';
import 'monaco-editor/editor/contrib/longLinesHelper/browser/longLinesHelper';
import 'monaco-editor/editor/contrib/middleScroll/browser/middleScroll.contribution';
import 'monaco-editor/editor/contrib/multicursor/browser/multicursor';
import 'monaco-editor/editor/contrib/parameterHints/browser/parameterHints';
import 'monaco-editor/editor/contrib/placeholderText/browser/placeholderText.contribution';
import 'monaco-editor/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess';
import 'monaco-editor/editor/standalone/browser/quickAccess/standaloneHelpQuickAccess';
import 'monaco-editor/editor/standalone/browser/quickAccess/standaloneGotoSymbolQuickAccess';
import 'monaco-editor/editor/contrib/readOnlyMessage/browser/contribution';
import 'monaco-editor/editor/standalone/browser/referenceSearch/standaloneReferenceSearch';
import 'monaco-editor/editor/contrib/rename/browser/rename';
import 'monaco-editor/editor/contrib/sectionHeaders/browser/sectionHeaders';
import 'monaco-editor/editor/contrib/semanticTokens/browser/viewportSemanticTokens';
import 'monaco-editor/editor/contrib/smartSelect/browser/smartSelect';
import 'monaco-editor/editor/contrib/snippet/browser/snippetController2';
import 'monaco-editor/editor/contrib/stickyScroll/browser/stickyScrollContribution';
import 'monaco-editor/editor/contrib/suggest/browser/suggestInlineCompletions';
import 'monaco-editor/editor/standalone/browser/toggleHighContrast/toggleHighContrast';
import 'monaco-editor/editor/contrib/toggleTabFocusMode/browser/toggleTabFocusMode';
import 'monaco-editor/editor/contrib/tokenization/browser/tokenization';
import 'monaco-editor/editor/contrib/unicodeHighlighter/browser/unicodeHighlighter';
import 'monaco-editor/editor/contrib/unusualLineTerminators/browser/unusualLineTerminators';
import 'monaco-editor/editor/contrib/wordHighlighter/browser/wordHighlighter';
import 'monaco-editor/editor/contrib/wordOperations/browser/wordOperations';
import 'monaco-editor/editor/contrib/wordPartOperations/browser/wordPartOperations';
import 'monaco-editor/editor/browser/coreCommands';
import 'monaco-editor/editor/contrib/caretOperations/browser/caretOperations';
import 'monaco-editor/editor/contrib/dropOrPasteInto/browser/copyPasteContribution';
import 'monaco-editor/editor/contrib/find/browser/findController';
import 'monaco-editor/editor/contrib/gotoSymbol/browser/goToCommands';
import 'monaco-editor/editor/contrib/gotoError/browser/markerSelectionStatus';
import 'monaco-editor/editor/contrib/semanticTokens/browser/documentSemanticTokens';
import 'monaco-editor/editor/contrib/suggest/browser/suggestController';
import 'monaco-editor/editor/common/standaloneStrings';
import '../../node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon-modifiers.css';

// --- Llenguatges bàsics (només els que usem) ---
import 'monaco-editor/languages/definitions/python/register';
import 'monaco-editor/languages/definitions/typescript/register';
import 'monaco-editor/languages/definitions/javascript/register';

// Embolcall mutable: `loadMonacoTypescript` hi afegeix `monaco.typescript`
// (com a `monaco-editor` sencer) quan un curs de React el necessita.
export const monaco: typeof editorApi & { typescript?: any } = { ...editorApi };
