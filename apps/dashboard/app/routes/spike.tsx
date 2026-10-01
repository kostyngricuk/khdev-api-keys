import { useState } from "react";
import { Form } from "react-router";
import {
  Button,
  Dialog,
  DialogHeader,
  SegmentedControl,
  SegmentedControlItem,
  Selector,
  Table,
  TextInput,
  useToast,
} from "@astryxdesign/core";

/**
 * TEMPORARY spike route (Task 1) — deleted in Task 7.
 *
 * Exercises every Astryx unknown at once: Button, TextInput, a Selector inside
 * a native GET <Form> (verifies the `htmlName` hidden-input submission path),
 * Dialog, Table, toast via useToast(), and SegmentedControl. It sits outside
 * the auth layout so it can be opened without logging in.
 */

const options = [
  { value: "alpha", label: "Alpha" },
  { value: "beta", label: "Beta" },
  { value: "gamma", label: "Gamma" },
];

const tableData = [
  { name: "First key", status: "active" },
  { name: "Second key", status: "revoked" },
];

const columns = [
  { key: "name", header: "Name" },
  { key: "status", header: "Status" },
];

export default function Spike() {
  const showToast = useToast();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState("alpha");
  const [segmented, setSegmented] = useState("one");
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto", display: "grid", gap: 24 }}>
      <h1>Astryx spike</h1>

      <section style={{ display: "grid", gap: 8 }}>
        <h2>Button</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Button label="Primary" variant="primary" />
          <Button label="Secondary" variant="secondary" />
          <Button label="Ghost" variant="ghost" />
        </div>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2>TextInput</h2>
        <TextInput label="Name" value={text} onChange={(value) => setText(value)} placeholder="Type here" />
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2>Selector in a native GET form</h2>
        <Form method="get">
          <div style={{ display: "grid", gap: 12 }}>
            <Selector
              label="Pick one"
              options={options}
              value={selected}
              onChange={(value) => setSelected(value)}
              htmlName="name"
            />
            <Button type="submit" label="Submit (GET)" variant="primary" />
          </div>
        </Form>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2>Dialog</h2>
        <Button label="Open dialog" variant="secondary" onClick={() => setDialogOpen(true)} />
        <Dialog isOpen={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
          <DialogHeader title="Spike dialog" subtitle="This is the header." onOpenChange={(open) => setDialogOpen(open)} />
          <p>This is the dialog body.</p>
          <Button label="Close" variant="primary" onClick={() => setDialogOpen(false)} />
        </Dialog>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2>Table</h2>
        <Table data={tableData} columns={columns} hasHover />
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2>Toast</h2>
        <Button
          label="Show toast"
          variant="secondary"
          onClick={() => showToast({ body: "Hello from Astryx", isAutoHide: true, autoHideDuration: 4000 })}
        />
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2>SegmentedControl</h2>
        <SegmentedControl label="Mode" value={segmented} onChange={(value) => setSegmented(value)}>
          <SegmentedControlItem value="one" label="One" />
          <SegmentedControlItem value="two" label="Two" />
        </SegmentedControl>
      </section>
    </div>
  );
}
