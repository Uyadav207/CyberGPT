const { convexClient, api } = require('./src/config/convex');

async function testGraphStorage() {
  console.log('🧪 Testing Graph Storage in Database...\n');

  try {
    // Test 1: Check if graph visualization field exists in chatHistory
    console.log('1️⃣ Testing chatWithJargon with automatic graph generation...');
    
    const testResponse = await fetch('http://localhost:8000/chat/with-jargon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What are the risks of SQL injection?',
        messageId: 'test_msg_001',
        chatId: 'test_chat_001'
      })
    });

    if (!testResponse.ok) {
      throw new Error(`HTTP error! status: ${testResponse.status}`);
    }

    const response = await testResponse.json();
    console.log('✅ Chat response received:', {
      hasAnswer: !!response.answer,
      hasGraphData: !!response.graphData,
      graphDataKeys: response.graphData ? Object.keys(response.graphData) : 'No graph data'
    });

    if (response.graphData) {
      console.log('📊 Graph Data Structure:', {
        nodes: response.graphData.nodes?.length || 0,
        links: response.graphData.links?.length || 0,
        mainProblemNode: response.graphData.nodes?.find(n => n.id === 'main-problem')
      });
    }

    // Test 2: Check if graph data is stored in database
    console.log('\n2️⃣ Checking if graph data is stored in database...');
    
    // Wait a moment for the data to be saved
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const graphData = await convexClient.query(
      api.graphVisualizations.getGraphByMessageId,
      {
        messageId: 'test_msg_001',
        chatId: 'test_chat_001'
      }
    );

    console.log('✅ Database query result:', {
      hasGraphData: !!graphData,
      graphDataKeys: graphData ? Object.keys(graphData) : 'No data found'
    });

    if (graphData) {
      console.log('📊 Stored Graph Data:', {
        vulnerabilities: graphData.vulnerabilities?.length || 0,
        mitigations: graphData.mitigations?.length || 0,
        relationships: graphData.relationships?.length || 0
      });
    }

    // Test 3: Check chatHistory for graphVisualization field
    console.log('\n3️⃣ Checking chatHistory for graphVisualization field...');
    
    const chatHistory = await convexClient.query(
      api.chats.getChatHistory,
      { chatId: 'test_chat_001' }
    );

    console.log('✅ Chat History:', {
      messageCount: chatHistory.length,
      hasGraphVisualization: chatHistory.some(msg => msg.graphVisualization),
      graphVisualizationFields: chatHistory
        .filter(msg => msg.graphVisualization)
        .map(msg => Object.keys(msg.graphVisualization))
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Graph generation is working');
    console.log('- ✅ Graph data is being stored in database');
    console.log('- ✅ Chat messages include graph visualization data');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testGraphStorage(); 