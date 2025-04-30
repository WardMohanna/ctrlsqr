import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Supplier from '@/models/Supplier';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();

  try {
    const deletedSupplier = await Supplier.findByIdAndDelete(params.id);

    if (!deletedSupplier) {
      return NextResponse.json({ message: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Supplier deleted' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ message: 'Error deleting supplier' }, { status: 500 });
  }
}
