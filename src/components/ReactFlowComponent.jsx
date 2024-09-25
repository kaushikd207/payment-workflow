import { useCallback, useState, useEffect, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import ResizableRotatableNode from "./ResizableRotatableNode";
import "@xyflow/react/dist/style.css";
import "./ReactFlowComponent.css";

const nodeTypes = {
  customNode: ResizableRotatableNode,
};

const getRandomValue = () => Math.floor(Math.random() * 500);

const nodeList = [
  {
    id: "1",
    label: "Google Pay",
    paymentAmount: 300,
    providerType: "Digital Wallet",
    status: "active",
  },
  {
    id: "2",
    label: "Stripe",
    paymentAmount: 450,
    providerType: "Payment Gateway",
    status: "inactive",
  },
  {
    id: "3",
    label: "Apple Pay",
    paymentAmount: 600,
    providerType: "Digital Wallet",
    status: "active",
  },
  {
    id: "4",
    label: "PayPal",
    paymentAmount: 125000,
    providerType: "Digital Wallet",
    status: "active",
  },
  {
    id: "5",
    label: "Amazon Pay",
    paymentAmount: 850,
    providerType: "Digital Wallet",
    status: "inactive",
  },
  {
    id: "6",
    label: "Square",
    paymentAmount: 350,
    providerType: "Payment Gateway",
    status: "active",
  },
].map((node) => ({
  ...{
    id: `${node.id}`,
    data: {
      label: node.label,
      paymentAmount: node.paymentAmount,
      providerType: node.providerType,
      status: node.status,
    },
    position: { x: getRandomValue(), y: getRandomValue() },
    type: "customNode",
  },
}));

// Create new node with delete handler
const createNodeWithDeleteHandler = (node, deleteNode) => ({
  ...node,
  data: { ...node.data, deleteNode: () => deleteNode(node.id) },
});

const ReactFlowComponent = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: "0",
      data: {
        label: (
          <div
            className="payment-initialize-node"
            style={{
              backgroundColor: "#007bff", // Blue background color
              color: "white", // White text color
              borderRadius: "10px", // Rounded corners
              padding: "20px", // Padding inside the node
              textAlign: "center", // Center align text
              width: "200px", // Set fixed width
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)", // Subtle shadow effect
            }}
          >
            <h3
              className="node-title"
              style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}
            >
              Payment Initialize
            </h3>
            <p className="node-amount" style={{ margin: 0, fontSize: "14px" }}>
              Amount: $300
            </p>
          </div>
        ),
        paymentAmount: 300,
      },
      position: { x: 250, y: 50 },
      type: "customNode",
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedId, setSelectedId] = useState("");
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [highlightedEdges, setHighlightedEdges] = useState(new Set());
  const [tooltip, setTooltip] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  // Load saved workflow from localStorage
  useEffect(() => {
    const savedWorkflow = localStorage.getItem("workflow");
    if (savedWorkflow) {
      try {
        const { nodes: savedNodes, edges: savedEdges } =
          JSON.parse(savedWorkflow);
        setNodes(
          savedNodes.map((node) =>
            createNodeWithDeleteHandler(node, deleteNode)
          )
        );
        setEdges(savedEdges || []);
      } catch (error) {
        console.error("Error loading saved workflow:", error);
      }
    }
  }, []);

  // Update history
  const updateHistory = (newNodes, newEdges) => {
    const newHistory = [
      ...history.slice(0, historyIndex + 1),
      { nodes: newNodes, edges: newEdges },
    ];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Handle connection and restrict to node "0"
  const onConnect = useCallback(
    (params) => {
      if (params.source === "0" || params.target === "0") {
        const newEdges = addEdge(params, edges);
        setEdges(newEdges);
        updateHistory(nodes, newEdges);
      } else {
        setTooltip("Edges can only connect to the Payment Initialize node!");
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 3000);
      }
    },
    [edges, nodes]
  );

  const deleteNode = useCallback(
    (nodeId) => {
      const updatedNodes = nodes.filter((node) => node.id !== nodeId);
      const updatedEdges = edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      updateHistory(updatedNodes, updatedEdges);
    },
    [edges, nodes]
  );

  const highlightConnections = useCallback(
    (selectedNodeId) => {
      const highlightedEdges = edges.filter(
        (edge) =>
          edge.source === selectedNodeId || edge.target === selectedNodeId
      );
      const connectedNodes = new Set(
        highlightedEdges.flatMap((edge) => [edge.source, edge.target])
      );
      setHighlightedNodes(connectedNodes);
      setHighlightedEdges(new Set(highlightedEdges.map((edge) => edge.id)));
    },
    [edges]
  );

  const handleNodes = useCallback(
    (e) => {
      const selectedId = e.target.value;
      const selectedNode = nodeList.find((node) => node.id === selectedId);
      if (selectedNode && !nodes.some((node) => node.id === selectedNode.id)) {
        const newNode = createNodeWithDeleteHandler(selectedNode, deleteNode);
        const updatedNodes = [...nodes, newNode];
        setNodes(updatedNodes);
        updateHistory(updatedNodes, edges);
      }
      setSelectedId(selectedId);
      highlightConnections(selectedId);
    },
    [nodes, edges, highlightConnections]
  );

  // Undo/Redo logic with boundaries
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const { nodes, edges } = history[historyIndex - 1];
      setNodes(nodes);
      setEdges(edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const { nodes, edges } = history[historyIndex + 1];
      setNodes(nodes);
      setEdges(edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Save, Load, Export, Import
  const saveWorkflow = useCallback(() => {
    localStorage.setItem("workflow", JSON.stringify({ nodes, edges }));
    alert("Workflow saved!");
  }, [nodes, edges]);

  const loadWorkflow = useCallback(() => {
    const savedWorkflow = localStorage.getItem("workflow");
    if (savedWorkflow) {
      const { nodes, edges } = JSON.parse(savedWorkflow);
      setNodes(nodes);
      setEdges(edges);
      alert("Workflow loaded!");
    } else {
      alert("No saved workflow found.");
    }
  }, []);

  const exportWorkflow = useCallback(() => {
    const blob = new Blob([JSON.stringify({ nodes, edges })], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const importWorkflow = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const { nodes, edges } = JSON.parse(e.target.result);
        setNodes(
          nodes.map((node) => createNodeWithDeleteHandler(node, deleteNode))
        );
        setEdges(edges);
        alert("Workflow imported successfully!");
      };
      reader.readAsText(file);
    }
  }, []);

  return (
    <>
      <div className="d-flex align-items-start container mt-4">
        <div className="app">
          <p>Please Select Payment Provider</p>
          <select
            className="form-select"
            name="nodeName"
            value={selectedId}
            onChange={handleNodes}
          >
            <option value="">Select</option>
            {nodeList.map((item) => (
              <option value={item.id} key={item.id}>
                {item.data.label}
              </option>
            ))}
          </select>

          <div className="row gap-2 mt-3">
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm border"
                onClick={undo}
                disabled={historyIndex <= 0}
              >
                Undo
              </button>
              <button
                className="btn btn-sm border"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                Redo
              </button>
              <button className="btn btn-sm border" onClick={saveWorkflow}>
                Save Workflow
              </button>
              <button className="btn btn-sm border" onClick={loadWorkflow}>
                Load Workflow
              </button>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm border" onClick={exportWorkflow}>
                Export Workflow
              </button>
              <input
                type="file"
                className="btn btn-sm border"
                onChange={importWorkflow}
              />
            </div>
          </div>
          {showTooltip && <div className="tooltip-container">{tooltip}</div>}
        </div>
        <div className="ms-5">
          <div style={{ height: 700, width: 900 }}>
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
              >
                <MiniMap
                  nodeColor={(n) =>
                    n.data.paymentAmount > 200 ? "red" : "blue"
                  }
                />
                <Controls />
                <Background />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReactFlowComponent;
