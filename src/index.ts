import '@logseq/libs';
import { CardbordPlugin } from './components/CardbordPlugin';
import './styles/cardbord.css';

// Основная функция инициализации плагина
async function main() {
  console.log('🔥 GRID MAKER ULTIMATE Loading...');
  
  // Показываем уведомление что плагин загружается
  logseq.UI.showMsg('🔥 GRID MAKER ULTIMATE Loading...', 'success');

  const plugin = new CardbordPlugin();
  
  // Регистрация команды через App API
  console.log('📝 Registering App command: cardbord');
  logseq.App.registerCommand('plugin', {
    key: 'ultimate-grid-2025',
    label: '🔥 Create Ultimate Grid',
    desc: 'Create ultimate interactive grid with cards',
    palette: true
  }, async () => {
    console.log('🎯 Cardbord App command triggered');
    logseq.UI.showMsg('🎯 Creating cardbord grid...', 'info');
    
    try {
      const gridId = await plugin.insertCardbordGrid();
      console.log('✅ Cardbord grid inserted with ID:', gridId);
      logseq.UI.showMsg('✅ Cardbord grid created!', 'success');
    } catch (error) {
      console.error('❌ Error inserting cardbord grid:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logseq.UI.showMsg('❌ Ошибка при создании сетки карточек: ' + errorMessage, 'error');
    }
  });

  // Также регистрируем как slash-команду для совместимости
  console.log('📝 Registering slash command: cardbord');
  logseq.Editor.registerSlashCommand('ultimate-grid', async (e) => {
    console.log('🎯 Cardbord slash command triggered', e);
    logseq.UI.showMsg('🎯 Creating cardbord grid...', 'info');
    
          try {
        const gridId = await plugin.insertCardbordGrid();
        console.log('✅ Cardbord grid inserted with ID:', gridId);
        logseq.UI.showMsg('✅ Cardbord grid created!', 'success');
      } catch (error) {
        console.error('❌ Error inserting cardbord grid:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        logseq.UI.showMsg('❌ Ошибка при создании сетки карточек: ' + errorMessage, 'error');
      }
  });

  // ИСПРАВЛЕННЫЙ МАКРО-РЕНДЕРЕР
  console.log('📝 Registering FIXED macro renderer');
  
  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    console.log('✅ FIXED RENDERER CALLED:', { slot, payload });
    
    const [type, ...args] = payload.arguments;
    console.log('✅ PARSED:', { type, args, slot });
    
        if (type === 'cardbord') {
      console.log('🎯 RENDERING CARDBORD with slot:', slot);
      
      // Получаем ID грида из аргументов
      const gridId = args[0] || 'unknown';
      console.log('🎯 Grid ID to render:', gridId);
      
      // Рендерим грид через плагин
      try {
        await plugin.renderGrid(slot, gridId);
        console.log('✅ CARDBORD GRID RENDERED successfully to slot:', slot);
      } catch (error) {
        console.error('❌ CARDBORD GRID RENDER ERROR:', error);
        
        // Fallback UI если что-то пошло не так
        const fallbackTemplate = `
          <div style="background: #ffeeee; padding: 20px; border: 2px solid #cc0000; border-radius: 8px;">
            <h3>❌ Cardbord Grid Error</h3>
            <p><strong>Grid ID:</strong> ${gridId}</p>
            <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
            <button onclick="console.log('Retry render for ${gridId}')" style="margin-top: 10px; padding: 5px 10px;">🔄 Retry</button>
          </div>
        `;
        
        logseq.provideUI({
          key: `cardbord-error-${Date.now()}`,
          slot,
          template: fallbackTemplate,
          reset: true
        });
      }
    } else {
      console.log('🔍 OTHER MACRO (ignoring):', type);
    }
  });

  // Инициализация системы тем
  await plugin.initializeThemeSystem();

  // Показываем информацию о загрузке
  console.log('✅ Cardbord Plugin Loaded Successfully');
  console.log('📍 Available commands: /cardbord (slash) + Command Palette');
  console.log('🔧 Plugin ID:', 'logseq-cardbord-plugin');
  
  // Показываем уведомление об успешной загрузке
  logseq.UI.showMsg('✅ Cardbord Plugin готов! Команды: /cardbord или Command Palette (Ctrl+Shift+P)', 'success');
}

// Запуск плагина
logseq.ready(main).catch(console.error);
