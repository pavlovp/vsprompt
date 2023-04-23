const vscode = require('vscode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require("openai");

function openNewFileInSplitView(filePath) {
  const uri = vscode.Uri.parse(`file:///${filePath}`);
  const options = {
    viewColumn: vscode.ViewColumn.Two, // display the document in the second column
    preview: false // open the document in a new editor pane, not as a preview
  };
  vscode.window.showTextDocument(uri, options);
}

let openaiApiKey;
function activate(context) {
  // Check if OpenAI API key is set
  openaiApiKey = vscode.workspace.getConfiguration().get('openai.apiKey');
  if (!openaiApiKey) {
    vscode.window.showInformationMessage(
      'OpenAI API key not set. Please set it in the extension settings.'
    );
    vscode.env.openExternal('https://platform.openai.com/account/api-keys');
    return;
  }


  let openAIButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

  openAIButton.text = '$(cpu) Complete with OpenAI (ctrl+shift+a)';
  openAIButton.tooltip = 'Complete with OpenAI';
  openAIButton.command = 'extension.invokeOpenAI';
  openAIButton.show();

  context.subscriptions.push(openAIButton);

  // Add command to invoke OpenAI API
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.invokeOpenAI', async () => {
      // Get active file contents
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showInformationMessage('No file open.');
        return;
      }
      const prompt = activeEditor.document.getText();

      // Invoke OpenAI API


      const result = await invokeOpenAI(prompt);

      // Save result to new file
      const fileName = path.basename(activeEditor.document.fileName);
      const dirName = path.dirname(activeEditor.document.fileName);
      const resultFileName = path.join(dirName, `completion-${fileName}`);
      fs.writeFileSync(resultFileName, result);

      openNewFileInSplitView(resultFileName);

      vscode.window.showInformationMessage(`Result saved to ${resultFileName}.`);
    })
  );
}

async function invokeOpenAI(prompt) {
  try {
    const configuration = new Configuration({
      apiKey: openaiApiKey,
    });
    const openai = new OpenAIApi(configuration);
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
    });
    const textResp = completion.data.choices[0].text;

    return textResp;
  } catch (error) {
    vscode.window.showErrorMessage(`OpenAI API error: ${error.message}`);
    return '';
  }
}

exports.activate = activate;
