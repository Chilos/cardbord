import '@logseq/libs';

console.log('🔬 MINIMAL TEST: Starting...');

logseq.ready(async () => {
  console.log('🔬 MINIMAL TEST: Plugin ready');
  
  // Метод 1: Прямая регистрация renderer
  console.log('🔬 MINIMAL TEST: Method 1 - Direct renderer');
  logseq.App.onMacroRendererSlotted(async (e) => {
    console.log('🔬 METHOD 1 CALLED:', e);
    logseq.provideUI({
      key: `method1-${Date.now()}`,
      slot: e.slot,
      template: '<div style="background:red;padding:10px;">METHOD 1 WORKS</div>',
      reset: true
    });
  });
  
  // Метод 2: Через provideModel
  console.log('🔬 MINIMAL TEST: Method 2 - provideModel');
  logseq.provideModel({
    minimal_test: (content: string) => {
      console.log('🔬 METHOD 2 CALLED:', content);
      return `<div style="background:blue;padding:10px;">METHOD 2: ${content}</div>`;
    }
  });
  
  // Метод 3: Через DB hook (экспериментальный)
  console.log('🔬 MINIMAL TEST: Method 3 - DB hook');
  logseq.DB.onChanged(async (e) => {
    if (e && e.blocks) {
      const blocks = e.blocks;
      for (const block of blocks) {
        if (block && block.content && block.content.includes('{{renderer minimal_test')) {
          console.log('🔬 METHOD 3 DETECTED:', block);
          // Используем setTimeout чтобы DOM успел обновиться
          setTimeout(() => {
            logseq.provideUI({
              key: `method3-${Date.now()}`,
              slot: `block_${block.uuid}`,
              template: '<div style="background:green;padding:10px;">METHOD 3 WORKS</div>',
              reset: true
            });
          }, 100);
        }
      }
    }
  });
  
  // Команда для создания тестового макроса
  logseq.Editor.registerSlashCommand('minimal-test', async () => {
    console.log('🔬 MINIMAL TEST: Command triggered');
    const block = await logseq.Editor.getCurrentBlock();
    if (block) {
      await logseq.Editor.updateBlock(block.uuid, '{{renderer minimal_test, hello}}');
      console.log('🔬 MINIMAL TEST: Macro inserted');
    }
  });
  
  console.log('🔬 MINIMAL TEST: All methods registered');
}).catch(console.error);
