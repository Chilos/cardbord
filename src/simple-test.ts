import '@logseq/libs';

console.log('🔥 SIMPLE TEST: Starting...');

logseq.ready(async () => {
  console.log('🔥 SIMPLE TEST: Ready function called');
  
  // Простая команда для создания макроса
  logseq.Editor.registerSlashCommand('simple-test', async () => {
    console.log('🔥 SIMPLE TEST: Command triggered');
    
    const currentBlock = await logseq.Editor.getCurrentBlock();
    if (currentBlock) {
      await logseq.Editor.updateBlock(currentBlock.uuid, '{{renderer simple-test, hello world}}');
      console.log('🔥 SIMPLE TEST: Macro inserted');
    }
  });
  
  // Простой макро-рендерер
  console.log('🔥 SIMPLE TEST: Registering macro renderer');
  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    console.log('🔥 SIMPLE TEST: Macro renderer called!', { slot, payload });
    
    const [type, ...args] = payload.arguments;
    console.log('🔥 SIMPLE TEST: Type:', type, 'Args:', args);
    
    if (type === 'simple-test') {
      console.log('🔥 SIMPLE TEST: Rendering simple test macro');
      
      const template = `
        <div style="background: yellow; padding: 20px; border: 2px solid red;">
          <h2>🎉 SIMPLE TEST WORKS!</h2>
          <p>Arguments: ${args.join(', ')}</p>
          <p>Slot: ${slot}</p>
        </div>
      `;
      
      logseq.provideUI({
        key: `simple-test-${Date.now()}`,
        slot,
        template,
        reset: true
      });
      
      console.log('🔥 SIMPLE TEST: UI provided successfully');
    }
  });
  
  console.log('🔥 SIMPLE TEST: All registered');
}).catch(console.error);
