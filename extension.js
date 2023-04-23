const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require("openai");

let openAIButton;

async function invokeOpenAI(prompt) {
  const openaiApiKey = vscode.workspace.getConfiguration().get('openai.apiKey');
  const openaiModel = vscode.workspace.getConfiguration().get('openai.model') || "text-davinci-003";
  const openaiTemperature = vscode.workspace.getConfiguration().get('openai.temperature') || 0.7;
  const openaiMaxTokens = vscode.workspace.getConfiguration().get('openai.maxTokens') || 1000;
  const openaiTopP = vscode.workspace.getConfiguration().get('openai.topP') || 1;
  const openaiFrequencyPenalty = vscode.workspace.getConfiguration().get('openai.frequencyPenalty') || 0;
  const openaiPresencePenalty = vscode.workspace.getConfiguration().get('openai.presencePenalty') || 0;

  if (!openaiApiKey) {
    vscode.window.showErrorMessage('OpenAI API key not set. Please set it in the extension settings.');
    await vscode.commands.executeCommand('workbench.action.openSettings', 'openai.apiKey');
    vscode.env.openExternal('https://platform.openai.com/account/api-keys');
    return '';
  }

  try {
    const configuration = new Configuration({
      apiKey: openaiApiKey,
    });
    const openai = new OpenAIApi(configuration);
    const completion = await openai.createCompletion({
      model: openaiModel,
      prompt: prompt,
      temperature: openaiTemperature,
      max_tokens: openaiMaxTokens,
      top_p: openaiTopP,
      frequency_penalty: openaiFrequencyPenalty,
      presence_penalty: openaiPresencePenalty,
    });
    const textResp = completion.data.choices[0].text;

    return textResp;
  } catch (error) {
    vscode.window.showErrorMessage(`OpenAI API error: ${error.message}`);
    return '';
  }
}

function openNewFileInSplitView(filePath) {
  const uri = vscode.Uri.parse(`file:///${filePath}`);
  const options = {
    viewColumn: vscode.ViewColumn.Two, // display the document in the second column
    preview: false // open the document in a new editor pane, not as a preview
  };
  vscode.window.showTextDocument(uri, options);
}

function activate(context) {
  openAIButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  openAIButton.text = '$(cpu) Complete with OpenAI (ctrl+shift+a)';
  openAIButton.tooltip = 'Complete with OpenAI';
  openAIButton.command = 'extension.invokeOpenAI';
  openAIButton.show();
  context.subscriptions.push(openAIButton);

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.invokeOpenAI', async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showInformationMessage('No file open.');
        return;
      }
      const prompt = activeEditor.document.getText();

      const result = await invokeOpenAI(prompt);

      if (result) {
        const fileName = path.basename(activeEditor.document.fileName);
        const dirName = path.dirname(activeEditor.document.fileName);
        const newFileName = getNewFileName(fileName);
        const resultFileName = path.join(dirName, newFileName);

        fs.writeFileSync(resultFileName, result);
        openNewFileInSplitView(resultFileName);
        vscode.window.showInformationMessage(`Result saved to ${resultFileName}.`);
      }
    })
  );
}

function getNewFileName(fileName) {
  return `completion-${fileName}`
}

exports.activate = activate;
