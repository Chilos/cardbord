import '@logseq/libs';

console.log('🔥 TEST: Simple plugin starting...');

async function simpleMain() {
  console.log('🔥 TEST: Simple main function called');
  
  // Показываем уведомление
  logseq.UI.showMsg('🔥 TEST PLUGIN LOADED!', 'success');
  
  // Регистрация через App API
  logseq.App.registerCommand('plugin', {
    key: 'test-cardbord',
    label: 'Test Cardbord Command',
    desc: 'Тестовая команда для проверки работы плагина',
    palette: true
  }, async () => {
    console.log('🔥 TEST: App.registerCommand triggered!');
    logseq.UI.showMsg('🔥 TEST APP API WORKED!', 'success');
    
    const currentBlock = await logseq.Editor.getCurrentBlock();
    if (currentBlock) {
      await logseq.Editor.updateBlock(currentBlock.uuid, '🎯 CARDBORD TEST BLOCK (App API)');
    }
  });

  // Регистрация slash-команды для совместимости
  logseq.Editor.registerSlashCommand('test-cardbord', async () => {
    console.log('🔥 TEST: registerSlashCommand triggered!');
    logseq.UI.showMsg('🔥 TEST SLASH COMMAND WORKED!', 'success');
    
    const currentBlock = await logseq.Editor.getCurrentBlock();
    if (currentBlock) {
      await logseq.Editor.updateBlock(currentBlock.uuid, '🎯 CARDBORD TEST BLOCK (Slash Command)');
    }
  });
  
  console.log('🔥 TEST: Command registered successfully');
}

logseq.ready(simpleMain).catch(console.error);
